-- Fix NULL string columns causing GoTrue scan errors
-- phone_change and email_change can be set to empty
UPDATE auth.users SET phone_change = '' WHERE phone_change IS NULL;
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;