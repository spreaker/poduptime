--
-- Activate IAM authentication for administrators
--

GRANT rds_iam TO administrator;

--
-- Create a dedicated user for lambda and grant IAM authentication
--
CREATE USER lambda;
GRANT rds_iam TO lambda;
GRANT CONNECT ON DATABASE poduptime TO lambda;

--
-- Grant SELECT, INSERT, UPDATE, DELETE on all existing tables and on all future
-- tables created by administrator to the lambda user
--
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lambda;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lambda;