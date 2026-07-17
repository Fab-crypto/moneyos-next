import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatMoney } from "@/lib/formatters";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { success: withinLimit } = await checkRateLimit(`subscription-script:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let body: { subscriptionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.subscriptionId) {
    return NextResponse.json({ error: "Missing subscription id." }, { status: 400 });
  }

  const { data: sub, error: subError } = await supabase
    .from("recurring_transactions")
    .select("name, amount, frequency")
    .eq("id", body.subscriptionId)
    .eq("user_id", user.id)
    .single();

  if (subError || !sub) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system: `You write short, polite, generic cancellation messages a person can send to a subscription provider's support team or use as a reference when cancelling online.

Rules:
- This is a generic template, not a real submission to any company — never claim it will actually cancel anything.
- Keep it short: a real, usable message a person could copy, not a full letter.
- Plain, polite, direct tone. No exclamation points, no guilt, no "we're sorry to see you go" filler on the user's behalf.
- Never invent account numbers, emails, or personal details — leave a clear placeholder like [your account email] where needed.`,
      messages: [
        {
          role: "user",
          content: `Write a short cancellation message for this subscription: ${sub.name}, $${formatMoney(sub.amount)} (${sub.frequency}).`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const script = textBlock && "text" in textBlock ? textBlock.text : "Couldn't generate a script right now.";

    return NextResponse.json({ script });
  } catch (err) {
    console.error("[subscriptions/cancellation-script] Anthropic call failed:", err);
    return NextResponse.json({ error: "Couldn't generate a script right now." }, { status: 500 });
  }
}
