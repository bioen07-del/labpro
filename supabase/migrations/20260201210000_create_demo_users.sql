-- ============================================
-- CREATE DEMO USERS IN SUPABASE AUTH
-- Run this in: Supabase Dashboard → SQL Editor
-- Password for all users: demo1234
-- ============================================

-- Helper function to create user with password
CREATE OR REPLACE FUNCTION create_auth_user(email text, password text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    email,
    crypt(password, gen_salt('bf')),
    now(),
    now(),
    now()
  )
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create demo users
SELECT create_auth_user('admin@labpro.local', 'demo1234');
SELECT create_auth_user('operator1@labpro.local', 'demo1234');
SELECT create_auth_user('operator2@labpro.local', 'demo1234');
SELECT create_auth_user('laborant1@labpro.local', 'demo1234');
SELECT create_auth_user('manager1@labpro.local', 'demo1234');
SELECT create_auth_user('qc1@labpro.local', 'demo1234');

-- Clean up helper function
DROP FUNCTION create_auth_user(text, text);

-- Verify users created
SELECT email, created_at FROM auth.users WHERE email LIKE '%@labpro.local' ORDER BY created_at;
