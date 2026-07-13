import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [profileResult, institutionsResult, subscriptionResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, created_at, notifications_enabled, monthly_income")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("institutions").select("id, name").eq("user_id", user.id).order("name"),
    supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error("[profile] failed to load profile:", profileResult.error);
  }
  if (institutionsResult.error) {
    console.error("[profile] failed to load institutions:", institutionsResult.error);
  }
  if (subscriptionResult.error) {
    console.error("[profile] failed to load subscription:", subscriptionResult.error);
  }

  const name = profileResult.data?.full_name?.trim() || user.email?.split("@")[0] || "there";

  const memberSince = profileResult.data?.created_at
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(profileResult.data.created_at))
    : null;

  const connectedBanks = (institutionsResult.data ?? []).map((i) => ({ id: i.id, name: i.name }));

  const isSubscribed = subscriptionResult.data?.status === "active" || subscriptionResult.data?.status === "trialing";

  return (
    <ProfileClient
      name={name}
      memberSince={memberSince}
      connectedBanks={connectedBanks}
      initialNotificationsEnabled={profileResult.data?.notifications_enabled ?? true}
      initialMonthlyIncome={profileResult.data?.monthly_income ?? null}
      isSubscribed={isSubscribed}
    />
  );
}
