-- AgroNavis local development seed
-- Creates the dev bypass user referenced in .env.example
-- Runs automatically on: npx supabase db reset
--
-- Credentials: dev@agronavis.local / password123
-- Matches NEXT_PUBLIC_DEV_EMAIL / NEXT_PUBLIC_DEV_PASSWORD in .env
-- DO NOT add real credentials or production data here.

DO $$
DECLARE
  dev_user_id uuid := gen_random_uuid();
BEGIN
  -- Only insert if the dev user doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'dev@agronavis.local'
  ) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      dev_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dev@agronavis.local',
      -- bcrypt hash of 'password123'
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"email_verified":true}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      dev_user_id,
      json_build_object('sub', dev_user_id::text, 'email', 'dev@agronavis.local'),
      'email',
      dev_user_id::text,
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Dev user created: dev@agronavis.local';
  ELSE
    RAISE NOTICE 'Dev user already exists, skipping.';
  END IF;
END $$;
