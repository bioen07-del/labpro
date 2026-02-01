import { createBrowserClient } from '@supabase/ssr'

// Environment variables (configured in Vercel Dashboard)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyyqzuuozuzlhdlzvohh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5eXF6dXVvenV6bGhkbHp2b2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDMwOTksImV4cCI6MjA4NTQxOTA5OX0.XsrKQc78LNYVZbqPpOlg4zSyFctgFTagUGOYrE5yn2k'

// Browser client for client-side usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export default supabase
