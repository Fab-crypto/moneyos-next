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

  const { success: withinLimit } = await checkRateLimit(`subscription-insight:${user.id}`);
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
    .select("name, amount, frequency, next_due_date, created_at")
    .eq("id", body.subscriptionId)
    .eq("user_id", user.id)
    .single();

  if (subError || !sub) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  const { data: history } = await supabase
    .from("subscription_price_history")
    .select("amount, effective_date")
    .eq("recurring_transaction_id", body.subscriptionId)
    .order("effective_date", { ascending: true });

  const historyText =
    (history ?? []).length > 0
      ? (history ?? []).map((h) => `$${h.amount} on ${h.effective_date}`).join("; ")
      : "no recorded price changes yet";

  const context = [
    `Subscription: ${sub.name}`,
    `Current amount: $${formatMoney(sub.amount)} (${sub.frequency})`,
    `First tracked: ${sub.created_at.slice(0, 10)}`,
    `Real price history: ${historyText}`,
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: `You are giving a calm, one-paragraph observation about a single real subscription inside MoneyOS.

Rules:
- Only use the data given below — never invent a price, a date, or a fact not present.
- Never recommend cancelling, keeping, or switching — just observe.
- Never give investment, tax, or legal advice.
- 2-3 sentences, plain language, no bullet points, no shame or alarm even if the price has increased.

Data:
${context}`,
      messages: [{ role: "user", content: "Give me a quick, real observation about this subscription." }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const insight = textBlock && "text" in textBlock ? textBlock.text : "Nothing notable to report right now.";

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("[subscriptions/insight] Anthropic call failed:", err);
    return NextResponse.json({ error: "Couldn't get an insight right now." }, { status: 500 });
  }
}
