BEGIN;

-- Migration 002 declared these as TIMESTAMP (no time zone), but the agent sends
-- an instant (`captured_at` is an ISO-8601 UTC string). Writing an instant into
-- a naive column silently converts it to the database session's wall clock, so
-- a screenshot captured at 06:35 UTC was filed as 23:35 on the previous day in a
-- UTC-7 session. Searching the capture date then returned nothing.
--
-- The USING clause reproduces exactly the conversion that happened on write:
-- the stored wall-clock values are interpreted in the session time zone, which
-- is the same zone the driver used when it wrote them. Run this migration with
-- the same TimeZone setting the application server uses; if that has changed
-- since the rows were written, replace current_setting('TimeZone') with the
-- zone that was in effect at write time.

ALTER TABLE employee_screenshots
  ALTER COLUMN captured_at TYPE TIMESTAMPTZ
    USING captured_at AT TIME ZONE current_setting('TimeZone'),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE current_setting('TimeZone'),
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ
    USING expires_at AT TIME ZONE current_setting('TimeZone');

ALTER TABLE screenshot_audit_logs
  ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE current_setting('TimeZone');

COMMIT;
