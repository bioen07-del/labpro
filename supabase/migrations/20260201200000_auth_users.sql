-- Create demo users in Supabase Auth
-- Run this in Supabase SQL Editor to enable quick login buttons
-- Password for all users: demo1234

-- Create admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@labpro.local',
    -- Replace with actual hashed password for 'demo1234'
    -- You can get this from Supabase Dashboard after creating a user manually
    '',
    now(),
    now(),
    now()
)
ON CONFLICT (email) DO NOTHING;

-- Alternative: Use Supabase CLI to create users
-- npx supabase auth signin email@labpro.local --password demo1234
-- Or use Dashboard: Authentication → Users → Add User
