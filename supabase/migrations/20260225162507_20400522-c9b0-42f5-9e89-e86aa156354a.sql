
-- Add client validation constraints (using DO block to handle existing constraints)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_format') THEN
    ALTER TABLE public.clients ADD CONSTRAINT email_format 
      CHECK (email IS NULL OR email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phone_format') THEN
    ALTER TABLE public.clients ADD CONSTRAINT phone_format 
      CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-]{6,}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'full_name_length') THEN
    ALTER TABLE public.clients ADD CONSTRAINT full_name_length 
      CHECK (char_length(full_name) BETWEEN 1 AND 200);
  END IF;
END $$;
