import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { daysAgo } from "@/lib/date";
import { getFinancialConfidence } from "@/lib/financial-confidence";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function buildSystemPrompt(context: string): string {
  return `You are MO, a calm, supportive money coach inside the MoneyOS app.

Financial data for this user, right now:
${context}

Rules — follow these exactly:
- Only answer using the financial data given above. If something isn't in the data, say plainly that you don't have enough information rather than guessing or estimating.
- Never give investment, tax, or legal advice.
- Never recommend a specific dollar amount to save, invest, or pay toward debt, and never name a debt-payoff strategy (like "avalanche" or "snowball").
- Keep your tone calm and supportive — never shame the user about their spending, and avoid alarming language even when a bill is overdue.
- Keep answers short: 2-4 sentences, plain language, no bullet lists.
- You may make simple observations ("Food spending is a bit higher than last week") but never tell the user what they "should" do with a specific number attached.`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSubscribed = subscription?.status === "active" || subscription?.status === "trialing";
  if (!isSubscribed) {
    return NextResponse.json({ error: "MO chat is a MoneyOS Plus feature." }, { status: 403 });
  }

  const { success: withinLimit } = await checkRateLimit(`mo-chat:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many messages. Please wait a moment and try again." }, { status: 429 });
  }

  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const trimmedMessages = messages.slice(-10);

  const [checkingResult, txResult, billsResult, confidence] = await Promise.all([
    supabase.from("accounts").select("current_balance, type, subtype").eq("is_active", true),
    supabase
      .from("transactions")
      .select("amount, category, date")
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", daysAgo(13)),
    supabase
      .from("recurring_transactions")
      .select("name, amount, next_due_date")
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(5),
    getFinancialConfidence(supabase, user.id),
  ]);

  const safeToSpendToday = (checkingResult.data ?? [])
    .filter((a) => a.type === "depository" && a.subtype === "checking")
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  const allTx = txResult.data ?? [];
  const today = daysAgo(0);
  const todaySpend = allTx.filter((t) => t.date === today).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const byCategoryThisWeek = new Map<string, number>();
  for (const t of allTx.filter((t) => t.date >= daysAgo(6))) {
    const cat = (t.category ?? "other").toLowerCase();
    byCategoryThisWeek.set(cat, (byCategoryThisWeek.get(cat) ?? 0) + Math.abs(t.amount));
  }
  const categoryBreakdown =
    [...byCategoryThisWeek.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(", ") || "no spending recorded this week";

  const upcomingBillsList =
    (billsResult.data ?? []).map((b) => `${b.name}: $${b.amount} due ${b.next_due_date}`).join("; ") ||
    "none on file";

  const context = [
    `Safe to Spend Today: $${safeToSpendToday.toFixed(2)}`,
    `Spent today so far: $${todaySpend.toFixed(2)}`,
    `This week's spending by category: ${categoryBreakdown}`,
    `Upcoming bills: ${upcomingBillsList}`,
    `Financial Confidence Score: ${confidence.score}% (a general wellness indicator shown elsewhere in the app; not a precise forecast)`,
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: buildSystemPrompt(context),
      messages: trimmedMessages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply = textBlock && "text" in textBlock ? textBlock.text : "I'm not sure how to answer that right now.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[mo-chat] Anthropic API call failed:", err);
    return NextResponse.json({ error: "MO couldn't respond right now. Please try again." }, { status: 500 });
  }
}
