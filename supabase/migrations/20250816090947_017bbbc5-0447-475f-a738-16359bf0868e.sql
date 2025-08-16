-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move uuid-ossp extension from public to extensions schema
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Move pg_cron extension from public to extensions schema if it exists
DROP EXTENSION IF EXISTS "pg_cron" CASCADE;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;

-- Update search path to include extensions schema
ALTER DATABASE postgres SET search_path = "$user", public, extensions;