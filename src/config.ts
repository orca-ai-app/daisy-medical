// Public, RLS-gated anon key — safe to bake into the bundle.
// Override at build time via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
export const SUPABASE_URL =
  import.meta.env['VITE_SUPABASE_URL'] ?? 'https://dmvajkreuwknjqxyxmlv.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env['VITE_SUPABASE_ANON_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdmFqa3JldXdrbmpxeHl4bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzczMDUsImV4cCI6MjA5Mjk1MzMwNX0.sbhF52EG3y3C0LRNKH40BhoSDMh_Mw7XOZSHXlb7O70';

export const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/submit-medical-declaration`;
