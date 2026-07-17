import "server-only";
import { normalizeMerchant } from "@/lib/recurring";

export interface SubscriptionForAnalysis {
  id: string;
  name: string;
  accountId: string;
  amount: number;
  reviewStatus: "pending" | "confirmed" | "ignored";
  createdAt: string;
  priceHistory: { amount: number; date: string }[];
}

export interface DuplicateGroup {
  normalizedName: string;
  subscriptions: { id: string; name: string; amount: number }[];
}

export function detectDuplicateSubscriptions(subs: SubscriptionForAnalysis[]): DuplicateGroup[] {
  const groups = new Map<string, SubscriptionForAnalysis[]>();

  for (const s of subs) {
    if (s.reviewStatus === "ignored") continue;
    const key = normalizeMerchant(s.name);
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [key, list] of groups) {
    const uniqueAccounts = new Set(list.map((s) => s.accountId));
    if (uniqueAccounts.size > 1) {
      duplicates.push({
        normalizedName: key,
        subscriptions: list.map((s) => ({ id: s.id, name: s.name, amount: s.amount })),
      });
    }
  }
  return duplicates;
}

export function findLongRunningSubscriptions(
  subs: SubscriptionForAnalysis[],
  monthsThreshold = 6
): SubscriptionForAnalysis[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsThreshold);

  return subs.filter((s) => s.reviewStatus !== "ignored" && new Date(s.createdAt) <= cutoff);
}

export interface HealthScoreResult {
  score: number;
  components: {
    spendTrend: number;
    renewalAwareness: number;
    duplicateExposure: number;
    priceStability: number;
  };
}

export function computeHealthScore(
  subs: SubscriptionForAnalysis[],
  duplicates: DuplicateGroup[]
): HealthScoreResult {
  const active = subs.filter((s) => s.reviewStatus !== "ignored");
  const total = active.length;

  if (total === 0) {
    return {
      score: 100,
      components: { spendTrend: 100, renewalAwareness: 100, duplicateExposure: 100, priceStability: 100 },
    };
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  let increases = 0;
  let decreases = 0;
  for (const s of active) {
    const recent = s.priceHistory.filter((h) => new Date(h.date) >= ninetyDaysAgo);
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].amount > recent[i - 1].amount) increases++;
      else if (recent[i].amount < recent[i - 1].amount) decreases++;
    }
  }
  const netChanges = increases + decreases;
  const spendTrend = netChanges === 0 ? 100 : Math.max(0, 100 - (increases / netChanges) * 100);

  const pendingCount = active.filter((s) => s.reviewStatus === "pending").length;
  const renewalAwareness = Math.round(((total - pendingCount) / total) * 100);

  const duplicateCount = duplicates.reduce((sum, g) => sum + g.subscriptions.length, 0);
  const duplicateExposure = Math.max(0, Math.round(100 - (duplicateCount / total) * 100));

  const subsWithIncrease = new Set<string>();
  for (const s of active) {
    for (let i = 1; i < s.priceHistory.length; i++) {
      if (s.priceHistory[i].amount > s.priceHistory[i - 1].amount) {
        subsWithIncrease.add(s.id);
        break;
      }
    }
  }
  const priceStability = Math.round(((total - subsWithIncrease.size) / total) * 100);

  const score = Math.round(
    spendTrend * 0.35 + renewalAwareness * 0.25 + duplicateExposure * 0.2 + priceStability * 0.2
  );

  return {
    score,
    components: { spendTrend: Math.round(spendTrend), renewalAwareness, duplicateExposure, priceStability },
  };
}
