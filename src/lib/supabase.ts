import { createClient } from "@supabase/supabase-js";

// Publishable values – safe to ship in the browser; data access is enforced by RLS.
const url = import.meta.env.VITE_SUPABASE_URL ?? "https://weumqdraczgfxrbejfay.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_Mmz-a_FLSmDkKR341e1ekA_rmouzGIu";

export const supabase = createClient(url, key);
