import { createClient } from "@supabase/supabase-js";

// Public, browser-safe configuration for the bank's external Supabase project.
// Never place service-role credentials here.
const SUPABASE_URL =
  import.meta.env['VITE_SUPABASE_URL'] ?? "https://zdfznfyfnhwzwrgoqqec.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
  "sb_publishable_W-igjIjupadQBc9tuRe16g_7_XV_GQF";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
