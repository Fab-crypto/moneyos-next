import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

function getDaysUntilDue(nextDueDate: string | null): number | null {
  if (!nextDueDate) return null;
  const due = new Date(nextDueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id")
    .eq("notifications_enabled", true);

  if (profilesError) {
    console.error("[cron/send-notifications] failed to fetch profiles:", profilesError);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }

  let notified = 0;
  let cleaned = 0;

  for (const profile of profiles ?? []) {
    const notifications: { title: string; body: string; url: string }[] = [];

    const { data: bills } = await admin
      .from("recurring_transactions")
      .select("name, amount, next_due_date")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(1);

    const soonest = bills?.[0];
    const daysUntilDue = soonest ? getDaysUntilDue(soonest.next_due_date) : null;
    if (soonest && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 1) {
      notifications.push({
        title: daysUntilDue === 0 ? `${soonest.name} is due today` : `${soonest.name} is due tomorrow`,
        body: `$${soonest.amount.toFixed(2)}`,
        url: "/dashboard",
      });
    }

    const { data: endingTrials } = await admin
      .from("recurring_transactions")
      .select("name, amount, trial_end_date")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .eq("is_trial", true)
      .not("trial_end_date", "is", null);

    for (const trial of endingTrials ?? []) {
      const daysUntilTrialEnd = getDaysUntilDue(trial.trial_end_date);
      if (daysUntilTrialEnd === null || daysUntilTrialEnd < 0 || daysUntilTrialEnd > 2) continue;
      notifications.push({
        title:
          daysUntilTrialEnd === 0
            ? `${trial.name}'s free trial ends today`
            : `${trial.name}'s free trial ends in ${daysUntilTrialEnd} day${daysUntilTrialEnd === 1 ? "" : "s"}`,
        body: `It'll convert to $${trial.amount.toFixed(2)} unless you cancel first.`,
        url: "/subscriptions",
      });
    }

    if (notifications.length === 0) continue;

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", profile.id);

    if (!subscriptions || subscriptions.length === 0) continue;

    for (const payload of notifications) {
      for (const sub of subscriptions) {
        const result = await sendPushNotification(sub, payload);
        if (result.success) {
          notified++;
        } else if (result.isGone) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          cleaned++;
        }
      }
    }
  }

  console.log(`[cron/send-notifications] notified=${notified} cleaned=${cleaned}`);

  return NextResponse.json({ success: true, notified, cleaned });
}
