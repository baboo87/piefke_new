## Supabase Setup

1. Open your Supabase SQL Editor.
2. Run the SQL from `supabase/schema.sql`.
3. Copy your project values into `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - optional: `VITE_SUPABASE_CHECKOUT_TABLE` (default `valuation_requests`)
4. Restart the Vite dev server.

After setup, every successful checkout flow stores the valuation payload in Supabase.
