export function NoDb() {
  return (
    <p className="rounded-xl border bg-warning-bg p-4 text-sm">
      Supabase er ikke konfigureret. Sæt <code>SUPABASE_URL</code> og <code>SUPABASE_SERVICE_ROLE_KEY</code> – se README.
    </p>
  );
}
