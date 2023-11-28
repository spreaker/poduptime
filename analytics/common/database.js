import pg from 'pg';
import { formatISO, parseISO } from 'date-fns';
import { Signer } from "@aws-sdk/rds-signer";
import fs from 'fs';
import url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const { Pool, types } = pg;

// Enable BIGINT parsing to JS integers
types.setTypeParser(20, x => parseInt(x, 10));
// Enable REAL parsing to JS floats
types.setTypeParser(1700, x => parseFloat(x));
// TIMESTAMP parsing to JS ISO8601 formatted string
types.setTypeParser(1114, x => formatISO(parseISO(x)));

let pool = null;
let expiresAtEpoch = null;
let rdsCertificate = null;

const EXPIRE_TOLERANCE = 60 * 1000; // 1 minute
const TOKEN_LIFETIME = 15 * 60 * 1000; // 15 minutes

const _getAuthToken = async (hostname, port, username) => {

    if (process.env.PGPASSWORD) {
        return { token: process.env.PGPASSWORD, ttl: TOKEN_LIFETIME };
    }

    const signerOptions = {
        region: process.env.AWS_REGION,
        hostname: hostname,
        port: port,
        username: username,
    };

    const signer = new Signer(signerOptions);

    try {
        const token = await signer.getAuthToken();
        return { token, ttl: TOKEN_LIFETIME };
    } catch (err) {
        throw err;
    }
};

const _getSslCertificate = () => {

    if (rdsCertificate) {
        return Promise.resolve(rdsCertificate);
    }

    return new Promise((resolve, reject) => {
        const filepath = `${__dirname}../support/ssl/us-east-1-bundle.pem`;
        fs.readFile(filepath, (err, content) => {
            if (err) {
                rdsCertificate = null;
                reject(err);
            } else {
                rdsCertificate = content;
                resolve(content);
            }
        });
    });
}

const _epoch = () => {
    return (new Date()).getTime();
}

const _isPoolValid = () => {

    if (!pool) {
        return false;
    }

    if (!expiresAtEpoch) {
        return true;
    }

    return _epoch() + EXPIRE_TOLERANCE < expiresAtEpoch;
}

const _getPool = async () => {

    // Check if the current pool can be used. A pool may be
    // considered invalid because the password currently
    // used to open the pool is about to expire
    if (_isPoolValid()) {
        return pool;
    }

    // Get rid of the old and invalid pool
    if (pool) {
        await pool.end();
        pool = null;
    }

    // Request a temporary RDS authentication token to be
    // used as the password to connect to RDS
    let { token, ttl } = await _getAuthToken(
        process.env.PGHOST, parseInt(process.env.PGPORT, 10), process.env.PGUSER
    );

    // Use ssl if we're running in AWS Lambda
    let ssl = null;
    if (process.env.AWS_EXECUTION_ENV) {
        ssl = { ca: await _getSslCertificate() };
    }

    expiresAtEpoch = _epoch() + ttl;

    pool = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT,
        password: token,
        ssl: ssl
    });

    return pool;
}

export const query = async (text, params) => {
    const pool = await _getPool();
    return await pool.query(text, params);
};

export const queryOne = async (text, params) => {
    const rows = (await query(text, params)).rows;
    return rows.length >= 1 ? rows[0] : null;
};

export const writeOne = async (text, params) => {
    const rows = (await query(text, params)).rows;
    if (rows.length !== 1) {
        throw new Error(`Write one did not generate one row but ${rows.length}`);
    }
    return rows[0];
};

export const release = async (text, params) => {
    if (!pool) {
        return;
    }
    await pool.end();
    pool = null;
};