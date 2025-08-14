-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule 1-week reminder emails to run daily at 9 AM UTC
SELECT cron.schedule(
  'send-week-reminders',
  '0 9 * * *', -- Daily at 9 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://lidbuempjyklxoutmwrv.supabase.co/functions/v1/send-week-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZGJ1ZW1wanlrbHhvdXRtd3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjY0MTYsImV4cCI6MjA2ODYwMjQxNn0.UArrJlevTFYNwu0Heq7alN0fw4btO4tV6ZrmjOZGjgI"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule 3-day reminder emails to run daily at 9:30 AM UTC
SELECT cron.schedule(
  'send-three-day-reminders',
  '30 9 * * *', -- Daily at 9:30 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://lidbuempjyklxoutmwrv.supabase.co/functions/v1/send-three-day-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZGJ1ZW1wanlrbHhvdXRtd3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjY0MTYsImV4cCI6MjA2ODYwMjQxNn0.UArrJlevTFYNwu0Heq7alN0fw4btO4tV6ZrmjOZGjgI"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);