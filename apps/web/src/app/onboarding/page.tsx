import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell, UsernameForm } from "@/features/auth";

export const metadata = { title: "xor" };

export default async function Onboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

  return (
    <AuthShell mood="party">
      <h1 className="text-3xl font-bold sm:text-4xl">{profile?.username ? "Change your username" : "What should we call you?"}</h1>
      <p className="mt-1 text-ink-soft">This is the name your friends see on leaderboards.</p>
      <UsernameForm current={profile?.username ?? ""} />
    </AuthShell>
  );
}

