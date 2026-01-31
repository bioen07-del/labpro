// Supabase client configuration
// Vercel Environment Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
// Fallback значения для разработки (должны быть переопределены в Vercel Dashboard)

import { createClient } from '@supabase/supabase-js'

// Fallback значения для локальной разработки
const DEFAULT_SUPABASE_URL = 'https://cyyqzuuozuzlhdlzvohh.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5eXF6dXVvenV6bGhkbHp2b2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDMwOTksImV4cCI6MjA4NTQxOTA5OX0.XsrKQc78LNYVZbqPpOlg4zSyFctgFTagUGOYrE5yn2k'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

// Создаём клиента - fallback значения уже заданы выше
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
