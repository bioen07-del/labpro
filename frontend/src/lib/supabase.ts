import { createBrowserClient } from '@supabase/ssr'

type SupabaseClient = ReturnType<typeof createBrowserClient>

let _client: SupabaseClient | null = null

function createClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During SSR prerendering without env vars — return a no-op proxy
    // Real requests will fail gracefully; the client will work in browser
    const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
    const chainable: any = new Proxy({}, {
      get() {
        return (..._args: any[]) => chainable
      }
    })
    // Make .then resolve so awaits work
    chainable.then = (resolve: any) => resolve({ data: null, error: { message: 'Supabase not configured' } })

    return new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === 'auth') {
          return new Proxy({}, {
            get() { return noop }
          })
        }
        if (prop === 'rpc') return noop
        if (prop === 'channel' || prop === 'removeChannel') return () => ({})
        // .from() should return chainable
        return () => chainable
      }
    })
  }

  _client = createBrowserClient(url, key)
  return _client
}

export const supabase = createClient()
export default supabase
