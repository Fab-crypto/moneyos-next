import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 requests per user per minute per route — generous enough for
// normal use (nobody legitimately connects/disconnects banks or hits
// the webhook 10 times in a minute), tight enough to stop abuse.
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});

/**
 * Checks whether this identifier (a user ID for authenticated routes,
 * or an item_id for the unauthenticated webhook) has exceeded the rate
 * limit. Returns { success: false } if it should be blocked.
 */
export async function checkRateLimit(identifier: string) {
  return ratelimit.limit(identifier);
}
