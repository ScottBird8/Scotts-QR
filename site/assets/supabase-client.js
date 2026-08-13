// Supabase project connection. The anon/public key is safe to ship in
// client-side code — it's designed for this and is constrained by the RLS
// policies in supabase/schema.sql (public read on properties/photos/videos,
// authenticated-only for writes and for qr_codes). Never put the
// service_role/secret key here.
const SUPABASE_URL = 'https://gilemtrntfamgznweslt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGVtdHJudGZhbWd6bndlc2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzAwMDIsImV4cCI6MjEwMjE0NjAwMn0.kjisqRzM5n_aeuuLHHu-fxkKqFLEK9x-U0AlIhAN_GA';

// `supabase` here is the global namespace injected by the CDN script
// (https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2), which must be
// loaded before this file. `sb` is the actual client every page uses.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
