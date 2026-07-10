import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "inactive" | "trialing" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "inactive";
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[stripe-webhook] missing stripe-signature header");
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
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!userId || !customerId || !subscriptionId) {
          console.error("[stripe-webhook] checkout.session.completed missing required fields", {
            userId,
            customerId,
            subscriptionId,
          });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items.data[0];
        const priceId = item?.price.id ?? null;
        const currentPeriodEnd = item?.current_period_end;

        const { error } = await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: mapStripeStatus(subscription.status),
            plan: priceId,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          },
          { onConflict: "user_id" }
        );

        if (error) {
          console.error("[stripe-webhook] failed to upsert subscription:", error);
        } else {
          console.log(`[stripe-webhook] subscription created for user=${userId} status=${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const item = subscription.items.data[0];
        const priceId = item?.price.id ?? null;
        const currentPeriodEnd = item?.current_period_end;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStripeStatus(subscription.status);

        const { error } = await admin
          .from("subscriptions")
          .update({
            status,
            plan: priceId,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error(`[stripe-webhook] failed to update subscription for customer=${customerId}:`, error);
        } else {
          console.log(`[stripe-webhook] ${event.type} for customer=${customerId} -> status=${status}`);
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] processing failed:", err);
    return NextResponse.json({ received: true });
  }
}
