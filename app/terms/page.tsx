 export const metadata = {
 title: "Terms of Service — MoneyOS",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: July 11, 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of MoneyOS, operated by Fabian Oduk
              (&quot;MoneyOS,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using MoneyOS, you agree
              to these Terms. If you do not agree, do not use MoneyOS.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              1. What MoneyOS Is
            </h2>
            <p className="mt-3">
              MoneyOS is a personal finance application that connects to your bank accounts (via
              Plaid) to show your balances, transactions, and spending patterns in one place, and
              offers observations and general information about your own financial activity.
            </p>
            <p className="mt-3 rounded-lg bg-muted/50 p-4">
              <strong className="text-foreground">MoneyOS is not a bank, broker, investment
              advisor, accountant, or law firm.</strong> Nothing in MoneyOS — including anything MO
              says, whether a suggested question or a free-form chat response — is financial,
              investment, tax, or legal advice. MO is an AI feature: its responses are
              AI-generated, informational only, and may contain mistakes. MO&apos;s observations are
              general information based on your own data, not a personalized recommendation, and
              should not be your sole basis for any financial decision. Always verify anything
              important against your own bank or financial records, and consult a licensed
              professional for advice specific to your situation.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              2. Eligibility and Accounts
            </h2>
            <p className="mt-3">
              You must be at least 18 years old and a resident of the United States to use
              MoneyOS. You&apos;re responsible for keeping your login credentials secure and for all
              activity under your account. You may not create an account on behalf of someone else
              without their permission, and each person may maintain only one account.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              3. Connecting Bank Accounts
            </h2>
            <p className="mt-3">
              MoneyOS uses Plaid to connect to your financial institutions. By connecting an
              account, you authorize MoneyOS to access and store the account and transaction data
              made available through that connection. You can disconnect any account at any time
              from the Accounts screen, which revokes MoneyOS&apos;s access with Plaid. MoneyOS is not
              responsible for the accuracy of data provided by your financial institution or by
              Plaid, and you should always confirm important balances directly with your bank.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              4. MoneyOS Plus Subscription
            </h2>
            <p className="mt-3">
              MoneyOS Plus is an optional paid subscription that unlocks additional features,
              including free-form chat with MO. Subscriptions are billed monthly in advance through
              Stripe and renew automatically until canceled. You can cancel anytime from your
              Profile page, which opens Stripe&apos;s billing portal; cancellation takes effect at the
              end of your current billing period, and we do not provide refunds for partial billing
              periods already paid for.
            </p>
            <p className="mt-3">
              We may change MoneyOS Plus&apos;s price or features going forward. If we do, we&apos;ll let you
              know before the change takes effect on your next billing cycle.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              5. Acceptable Use
            </h2>
            <p className="mt-3">You agree not to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Use MoneyOS for any unlawful purpose, or to connect accounts you&apos;re not authorized to access.</li>
              <li>Attempt to interfere with, disrupt, or gain unauthorized access to MoneyOS&apos;s systems.</li>
              <li>Use automated means to access MoneyOS in a way that could overload or abuse our systems or our third-party providers.</li>
              <li>Misrepresent your identity or impersonate another person.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              6. Disclaimers
            </h2>
            <p className="mt-3">
              MoneyOS is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, express
              or implied. We do not guarantee that MoneyOS will be uninterrupted, error-free, or
              that data from Plaid, Stripe, Anthropic, or any other third-party service will always
              be accurate or available. MoneyOS relies on these third-party services to function,
              and we are not responsible for their outages, errors, or changes to their own terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              7. Limitation of Liability
            </h2>
            <p className="mt-3">
              To the fullest extent permitted by law, MoneyOS and Fabian Oduk will not be liable for
              any indirect, incidental, special, or consequential damages, or for any loss of
              profits, data, or financial loss, arising from your use of or inability to use
              MoneyOS, even if we&apos;ve been advised of the possibility of such damages. Our total
              liability for any claim relating to MoneyOS will not exceed the amount you paid us, if
              any, in the 12 months before the claim arose.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              8. Termination
            </h2>
            <p className="mt-3">
              You may stop using MoneyOS and request deletion of your account at any time (see our{" "}
              <a href="/privacy" className="gold-text underline">
                Privacy Policy
              </a>{" "}
              for how). We may suspend or terminate your access if we reasonably believe you&apos;ve
              violated these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              9. Governing Law and Disputes
            </h2>
            <p className="mt-3">
              These Terms are governed by the laws of the State of California, without regard to its
              conflict-of-law principles. Any dispute arising from these Terms or your use of
              MoneyOS will be resolved in the state or federal courts located in California, and you
              consent to their jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              10. Changes to These Terms
            </h2>
            <p className="mt-3">
              We may update these Terms from time to time. If we make material changes, we&apos;ll update
              the effective date above and, where appropriate, notify you directly. Continued use of
              MoneyOS after changes take effect means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              11. Contact Us
            </h2>
            <p className="mt-3">
              Questions about these Terms can be sent to{" "}
              <a href="mailto:odukfabian@gmail.com" className="gold-text underline">
                odukfabian@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
