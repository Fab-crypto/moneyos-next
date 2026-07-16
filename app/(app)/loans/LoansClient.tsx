"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CreditCard, Home, GraduationCap, Sparkle, TrendingUp, TrendingDown } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";

interface Loan {
  id: string;
  name: string;
  mask: string | null;
  institutionName: string;
  balance: number;
  loanType: "credit" | "mortgage" | "student" | null;
  interestRate: number | null;
  nextPaymentDueDate: string | null;
  minimumPaymentAmount: number | null;
  isOverdue: boolean;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  details: Record<string, unknown> | null;
  payoffDate: string | null;
  payoffYearsRemaining: number | null;
  payoffMonths: number | null;
  totalInterestRemaining: number | null;
  neverPaysOffAtCurrentPayment: boolean;
  balanceHistory: { date: string; balance: number }[];
}

const LOAN_ICON = {
  credit: CreditCard,
  mortgage: Home,
  student: GraduationCap,
} as const;

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

interface LoansClientProps {
  loans: Loan[];
}

export function LoansClient({ loans }: LoansClientProps) {
  const reduceMotion = useReducedMotion();

  const totalOwed = loans.reduce((sum, l) => sum + l.balance, 0);

  const pageContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } },
  };
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.45, ease: EASE } },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto ${SHELL_WIDTH} min-h-screen bg-background sm:border-x sm:border-border/40`}>
        <motion.main
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="px-6 pb-32 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.div variants={item}>
            <h1 className="font-heading text-[36px] font-semibold leading-tight tracking-tight text-foreground">
              Loans
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">Everything you owe, in one place.</p>
          </motion.div>

          {loans.length === 0 ? (
            <motion.div variants={item} className="mt-8">
              <EmptyState
                icon={Sparkle}
                title="No loans connected"
                description="If you connect a bank with a credit card, mortgage, or student loan, it'll show up here automatically."
              />
            </motion.div>
          ) : (
            <>
              <motion.div variants={item}>
                <MoneyCard glow className="mt-6 p-7">
                  <SectionHeader>Total Owed</SectionHeader>
                  <p className="tabular relative z-10 mt-4 font-heading text-[44px] font-bold leading-none tracking-[-0.02em] text-foreground">
                    ${formatMoney(totalOwed)}
                  </p>
                  <p className="mt-3 text-[14px] text-muted-foreground">
                    Across {loans.length} {loans.length === 1 ? "account" : "accounts"}
                  </p>
                </MoneyCard>
              </motion.div>

              <div className="mt-6 space-y-4">
                {loans.map((loan) => {
                  const Icon = loan.loanType ? LOAN_ICON[loan.loanType] : CreditCard;
                  const pslf = loan.details?.pslf_status as
                    | { payments_made: number; payments_remaining: number }
                    | undefined;
                  const propertyAddress = loan.details?.property_address as
                    | { street: string; city: string; region: string }
                    | undefined;

                  return (
                    <motion.div key={loan.id} variants={item}>
                      <MoneyCard>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Icon size={16} className="text-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium text-foreground">{loan.name}</p>
                            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                              {loan.institutionName}
                              {loan.mask ? ` · ····${loan.mask}` : ""}
                            </p>
                          </div>
                          <p className="tabular shrink-0 text-[17px] font-semibold text-foreground">
                            ${formatMoney(loan.balance)}
                          </p>
                        </div>

                        <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                          {loan.interestRate !== null && (
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-muted-foreground">Interest rate</span>
                              <span className="tabular font-medium text-foreground/90">{loan.interestRate}%</span>
                            </div>
                          )}
                          {loan.nextPaymentDueDate && (
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-muted-foreground">
                                {loan.isOverdue ? "Payment was due" : "Next payment due"}
                              </span>
                              <span className="tabular font-medium text-foreground/90">
                                {formatDate(loan.nextPaymentDueDate)}
                              </span>
                            </div>
                          )}
                          {loan.minimumPaymentAmount !== null && (
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-muted-foreground">Minimum payment</span>
                              <span className="tabular font-medium text-foreground/90">
                                ${formatMoney(loan.minimumPaymentAmount)}
                              </span>
                            </div>
                          )}
                          {loan.lastPaymentAmount !== null && loan.lastPaymentDate && (
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-muted-foreground">Last payment</span>
                              <span className="tabular font-medium text-foreground/90">
                                ${formatMoney(loan.lastPaymentAmount)} on {formatDate(loan.lastPaymentDate)}
                              </span>
                            </div>
                          )}
                          {propertyAddress && (
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-muted-foreground">Property</span>
                              <span className="text-right font-medium text-foreground/90">
                                {propertyAddress.street}, {propertyAddress.city} {propertyAddress.region}
                              </span>
                            </div>
                          )}
                          {pslf && (
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-muted-foreground">PSLF progress</span>
                              <span className="tabular font-medium text-foreground/90">
                                {pslf.payments_made} of {pslf.payments_made + pslf.payments_remaining} payments
                              </span>
                            </div>
                          )}
                        </div>

                        {(loan.payoffDate || loan.neverPaysOffAtCurrentPayment) && (
                          <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                            {loan.neverPaysOffAtCurrentPayment ? (
                              <p className="text-[13px] leading-relaxed text-muted-foreground">
                                At the current minimum payment, this balance won't pay down — the
                                payment doesn't cover the monthly interest.
                              </p>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-[13px]">
                                  <span className="text-muted-foreground">Projected payoff</span>
                                  <span className="tabular font-medium text-foreground/90">
                                    {formatDate(loan.payoffDate)}
                                    {loan.payoffYearsRemaining !== null &&
                                      ` (${loan.payoffYearsRemaining} yr)`}
                                  </span>
                                </div>
                                {loan.totalInterestRemaining !== null && (
                                  <div className="flex items-center justify-between text-[13px]">
                                    <span className="text-muted-foreground">
                                      Total interest at minimum payment
                                    </span>
                                    <span className="tabular font-medium text-foreground/90">
                                      ${formatMoney(loan.totalInterestRemaining)}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {loan.balanceHistory.length >= 2 && (
                          <BalanceTrendRow history={loan.balanceHistory} />
                        )}
                      </MoneyCard>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.main>
      </div>

      <BottomNav />
    </div>
  );
}

function BalanceTrendRow({ history }: { history: { date: string; balance: number }[] }) {
  const first = history[0].balance;
  const last = history[history.length - 1].balance;
  const isDown = last < first;
  const isUp = last > first;
  const Icon = isDown ? TrendingDown : isUp ? TrendingUp : null;

  return (
    <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 text-[13px]">
      <span className="text-muted-foreground">Balance trend</span>
      <div className={`flex items-center gap-1.5 font-medium ${isDown ? "text-success" : "text-foreground/90"}`}>
        {Icon && <Icon size={13} />}
        <span className="tabular">
          ${formatMoney(first)} → ${formatMoney(last)}
        </span>
      </div>
    </div>
  );
}
