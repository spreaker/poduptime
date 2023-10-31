
class GenericError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GenericError';
        this.code = 'ERROR_GENERIC';
    }
}

export class UnexpectedRedirectLocationError extends GenericError {
    constructor(location) {
        const message = `Unexpected Redirect Location: ${location}`;
        super(message);
        Error.captureStackTrace(this, UnexpectedRedirectLocationError);
        this.name = 'UnexpectedRedirectLocationError';
        this.message = message;
        this.code = 'ERROR_UNEXPECTED_REDIRECT_LOCATION';
    }
}

export class UnexpectedHttpStatusError extends GenericError {
    constructor(status) {
        const message = `Unexpected HTTP Status: ${status}`;
        super(message);
        Error.captureStackTrace(this, UnexpectedHttpStatusError);
        this.name = 'UnexpectedHttpStatusError';
        this.message = message;
        this.code = 'ERROR_UNEXPECTED_HTTP_STATUS';
    }
}

export const serializeError = function (error) {

    if (!error) {
        return null;
    }

    return {
        name: error.name,
        code: error.code,
        message: error.message
    }
}