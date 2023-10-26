--
-- Measurements table
--

CREATE TABLE measurements (
    id         UUID PRIMARY KEY,
    timestamp  TIMESTAMP NOT NULL,
    endpoint   TEXT NOT NULL,
    type       TEXT NOT NULL,
    region     TEXT NOT NULL,
    available  INTEGER NOT NULL,
    duration   REAL NOT NULL
);

CREATE INDEX measurements_timestamp_endpoint_idx ON measurements (timestamp, endpoint);