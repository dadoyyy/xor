import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Supabase client that acts as the signed-in user (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; the proxy refreshes sessions instead.
          }
        },
      },
    },
  );
}

/**
 * Admin client with the service role key. Bypasses RLS — use only on the
 * server, and only after checking the user is allowed to do the action.
 * Throws a loud fatal error if the service role key is missing.
 */
export function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("[FATAL] NEXT_PUBLIC_SUPABASE_URL is not set in environment.");
  }
  if (!key || key.trim() === "" || key.includes("your-service-role-key")) {
    throw new Error(
      "[FATAL] SUPABASE_SERVICE_ROLE_KEY is missing or invalid. createAdmin() cannot bypass RLS without SUPABASE_SERVICE_ROLE_KEY. Check apps/web/.env.local or root .env.local."
    );
  }

  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

