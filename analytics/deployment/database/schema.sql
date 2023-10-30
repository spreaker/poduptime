--
-- Measurements table, to store measurements that will be aggregated
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

--
-- Raw Unavailable table, to store recent failures for troubleshooting purposes
--

CREATE TABLE unavailables (
    id         UUID PRIMARY KEY,
    timestamp  TIMESTAMP NOT NULL,
    endpoint   TEXT NOT NULL,
    type       TEXT NOT NULL,
    region     TEXT NOT NULL,
    details    TEXT NOT NULL
);

CREATE INDEX unavailables_timestamp_endpoint_idx ON unavailables (timestamp, endpoint);