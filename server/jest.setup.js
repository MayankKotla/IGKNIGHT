// Route/middleware modules construct a Supabase client at require-time
// (e.g. `createClient(process.env.SUPABASE_URL, ...)` at the top of
// courses.js and auth.js), which throws immediately if those env vars are
// missing — so every test file needs them set before it requires anything,
// even tests that never actually talk to Supabase. Dummy, non-functional
// values are enough since createClient only validates presence/format, not
// connectivity, at construction time.
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
