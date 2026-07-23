import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, money_feeling, calm_goals, onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const checkout = params.checkout === "success" || params.checkout === "cancelled" ? params.checkout : null;

  const firstName = profile?.full_name?.split(" ")[0] ?? null;

  return (
    <OnboardingClient
      firstName={firstName}
      initialFeeling={profile?.money_feeling ?? null}
      initialGoals={profile?.calm_goals ?? []}
      checkout={checkout}
      hasPlus={subscription?.status === "active" || subscription?.status === "trialing"}
    />
  );
}
