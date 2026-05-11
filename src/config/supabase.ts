import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not set");
}

if (!supabaseKey) {
  throw new Error(
    "Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY is set"
  );
}

export const supabaseUploadsBucket =
  process.env.SUPABASE_UPLOADS_BUCKET ?? "pdfs";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
