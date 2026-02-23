-- =====================================================================
-- FIX : Champs NULL dans auth.users → "Database error querying schema"
-- =====================================================================
-- GoTrue scanne toutes les colonnes de auth.users au démarrage.
-- Certains champs de type text ne doivent pas être NULL :
--   • email_change
--   • email_change_token_new
--   • email_change_token_current
--   • recovery_token
--   • confirmation_token
--   • phone_change
--   • phone
-- Un NULL sur ces champs provoque une erreur de scan GoTrue.
-- =====================================================================

-- 1. Corriger tous les utilisateurs existants
UPDATE auth.users
SET
  email_change              = COALESCE(email_change, ''),
  email_change_token_new    = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  recovery_token            = COALESCE(recovery_token, ''),
  confirmation_token        = COALESCE(confirmation_token, ''),
  phone                     = COALESCE(phone, ''),
  phone_change              = COALESCE(phone_change, ''),
  phone_change_token        = COALESCE(phone_change_token, ''),
  reauthentication_token    = COALESCE(reauthentication_token, ''),
  email_change_sent_at      = email_change_sent_at -- keep as-is (nullable OK)
WHERE
  email_change IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR email_change_confirm_status IS NULL
  OR recovery_token IS NULL
  OR confirmation_token IS NULL;

-- 2. Confirmation
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM auth.users
  WHERE
    email_change IS NULL
    OR email_change_token_new IS NULL
    OR email_change_token_current IS NULL
    OR recovery_token IS NULL
    OR confirmation_token IS NULL;

  IF cnt = 0 THEN
    RAISE NOTICE '✅ Tous les champs NULL ont été corrigés dans auth.users.';
  ELSE
    RAISE WARNING '⚠️ Il reste % utilisateur(s) avec des champs NULL dans auth.users.', cnt;
  END IF;
END $$;
