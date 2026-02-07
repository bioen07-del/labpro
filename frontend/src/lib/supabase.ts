import { createBrowserClient } from '@supabase/ssr'

type SupabaseClient = ReturnType<typeof createBrowserClient>

let _client: SupabaseClient | null = null

function createClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During SSR prerendering or when env vars are missing — return a no-op stub
    const noopSubscription = { unsubscribe: () => {} }

    const authStub = {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: noopSubscription } }),
    }

    const chainable: any = new Proxy({}, {
      get() {
        return (..._args: any[]) => chainable
      }
    })
    chainable.then = (resolve: any) => resolve({ data: null, error: { message: 'Supabase not configured' } })

    return new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === 'auth') return authStub
        if (prop === 'rpc') return () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
        if (prop === 'channel') return () => ({ on: () => ({ subscribe: () => {} }) })
        if (prop === 'removeChannel') return () => {}
        return () => chainable
      }
    })
  }

  _client = createBrowserClient(url, key)
  return _client
}

export const supabase = createClient()
export default supabase
