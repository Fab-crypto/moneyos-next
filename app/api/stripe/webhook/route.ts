import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;

        if (!userId) {
          console.error("[stripe-webhook] checkout.session.completed with no client_reference_id");
          break;
        }
        if (!session.subscription || typeof session.subscription !== "string") {
          console.error("[stripe-webhook] checkout.session.completed with no subscription id");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

        const { error } = await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan: subscription.items.data[0]?.price.id ?? null,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          },
          { onConflict: "user_id" }
        );

        if (error) {
          console.error("[stripe-webhook] failed to upsert subscription:", error);
        } else {
          console.log(`[stripe-webhook] subscription activated for user=${userId}`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

        const { error } = await admin
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("[stripe-webhook] failed to update subscription:", error);
        } else {
          console.log(`[stripe-webhook] subscription ${subscription.id} status=${subscription.status}`);
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] processing failed:", err);
    return NextResponse.json({ received: true });
  }
}
