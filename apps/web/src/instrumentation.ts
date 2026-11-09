export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only enforce fatal exit during live server runtime, not during static build/export phase
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl && !isBuildPhase) {
      console.error(
        "\x1b[31m[FATAL STARTUP] NEXT_PUBLIC_SUPABASE_URL is missing in environment variables.\x1b[0m",
      );
    }
    if (!serviceKey || serviceKey.trim() === "" || serviceKey.includes("your-service-role-key")) {
      const msg =
        "[FATAL STARTUP] SUPABASE_SERVICE_ROLE_KEY is missing or contains placeholder. " +
        "Server-side admin operations (forking, quiz grading, activity recording) require a valid service role key to bypass RLS.";
      console.error(`\x1b[31m${msg}\x1b[0m`);
      if (process.env.NODE_ENV === "production" && !isBuildPhase) {
        throw new Error(msg);
      }
    }
  }
}

