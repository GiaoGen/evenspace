export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { validateSupabaseStartupEnv } = await import(
    "@/data/supabase/env-server"
  );

  validateSupabaseStartupEnv();
}
