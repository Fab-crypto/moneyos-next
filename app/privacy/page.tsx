export const metadata = {
  title: "Privacy Policy — MoneyOS",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: July 11, 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          <section>
            <p>
              MoneyOS ("MoneyOS," "we," "us," or "our") is operated by Fabian Oduk. This Privacy
              Policy explains what information we collect when you use MoneyOS, how we use it, who
              we share it with, and the choices you have. By using MoneyOS, you agree to the
              practices described here.
            </p>
            <p className="mt-4">
              This policy is written to accurately describe what MoneyOS actually does today. It
              will be updated as the product changes, and we'll note the effective date above
              whenever that happens.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              1. Information We Collect
            </h2>
            <p className="mt-3">
              <strong className="text-foreground">Account information.</strong> When you create an
              account, we collect your email address and, if you provide it, your name.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Financial data.</strong> When you connect a bank
              account through Plaid, we receive and store account balances, account and institution
              names, and transaction history (merchant names, amounts, dates, and categories) for
              the accounts you choose to connect. We do not receive your online banking username or
              password — Plaid handles that connection directly with your bank and never shares your
              banking credentials with us.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Payment information.</strong> If you subscribe to
              MoneyOS Plus, your payment is processed by Stripe. We do not receive or store your
              full card number — we receive limited information from Stripe needed to identify your
              subscription status (such as a customer ID and subscription status).
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Conversations with MO (MoneyOS Plus only).</strong>{" "}
              If you use MO's free-form chat feature (available to MoneyOS Plus subscribers), your
              questions and a summary of your relevant financial data (such as your Safe to Spend
              balance, recent spending by category, and upcoming bills) are sent to Anthropic, our
              AI provider, in order to generate a response. This only happens when you actively use
              the chat feature — it does not happen automatically or in the background. MO's
              responses are AI-generated, informational only, and may contain mistakes — always
              verify anything important against your own bank or financial records rather than
              relying on MO alone.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Usage and technical data.</strong> We use error
              tracking (Sentry) to identify and fix bugs. This can include technical details about
              your device and how a page was being used at the moment of an error, but we do not use
              screen-recording or session-replay tools, and we do not track you for advertising
              purposes.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              2. How We Use Your Information
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>To operate MoneyOS's core features — showing your balances, transactions, spending patterns, and MO's insights.</li>
              <li>To process your MoneyOS Plus subscription and communicate about billing.</li>
              <li>To detect, investigate, and fix technical problems.</li>
              <li>To protect the security of your account and prevent abuse (for example, rate-limiting repeated requests).</li>
              <li>To communicate with you about your account, such as security notices or changes to this policy.</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal or financial information to third parties, and we do not
              use your financial data for advertising.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              3. Who We Share Information With
            </h2>
            <p className="mt-3">
              We share information only with the service providers who help us operate MoneyOS, and
              only as needed for them to perform their function:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong className="text-foreground">Plaid</strong> — to connect to and retrieve data from your bank accounts.</li>
              <li><strong className="text-foreground">Supabase</strong> — our database and authentication provider, which stores your account and financial data securely.</li>
              <li><strong className="text-foreground">Stripe</strong> — to process MoneyOS Plus subscription payments.</li>
              <li><strong className="text-foreground">Anthropic</strong> — to generate MO's responses, only when a MoneyOS Plus subscriber actively uses the free-form chat feature.</li>
              <li><strong className="text-foreground">Sentry</strong> — for error tracking and debugging.</li>
              <li><strong className="text-foreground">Vercel</strong> — our hosting provider.</li>
              <li><strong className="text-foreground">Upstash</strong> — used only to enforce rate limits (for example, to prevent abuse of our connection or chat features); it does not receive your financial data.</li>
            </ul>
            <p className="mt-3">
              We may also disclose information if required by law, or to protect the rights,
              property, or safety of MoneyOS, our users, or others.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              4. Cookies and Similar Technologies
            </h2>
            <p className="mt-3">
              MoneyOS uses a small number of essential cookies to keep you securely signed in
              between visits. We don't use advertising or tracking cookies, and we don't use
              analytics tools that build a profile of your browsing behavior. When you connect a
              bank account or manage a subscription, Plaid and Stripe may set their own cookies as
              part of completing that connection or checkout — those are governed by Plaid's and
              Stripe's own privacy policies, not this one.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              5. Security Practices
            </h2>
            <p className="mt-3">
              We take reasonable technical measures to protect your information, including:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Encryption in transit (HTTPS/TLS) for all connections to MoneyOS.</li>
              <li>Encryption at rest for sensitive credentials, such as your bank connection tokens.</li>
              <li>Database-level access controls that restrict your data to your own account.</li>
              <li>Rate limiting to help prevent automated abuse of our systems.</li>
            </ul>
            <p className="mt-3">
              No method of storage or transmission is completely secure, and we cannot guarantee
              absolute security. We do not currently hold formal security certifications (such as
              SOC 2 or ISO 27001); if that changes, we'll update this section.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              6. Data Retention
            </h2>
            <p className="mt-3">
              We retain your account and financial data for as long as your account is active, so
              that MoneyOS can function. If you request account deletion, we delete your financial
              and account data from our active systems; residual copies may briefly persist in
              backups for a limited period before being purged in the normal course of our backup
              cycle. Error logs (from Sentry) are retained only as long as needed to diagnose and
              fix issues, and are not kept indefinitely.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              7. Data Accuracy
            </h2>
            <p className="mt-3">
              MoneyOS displays information provided by your financial institutions through Plaid.
              This data can occasionally be delayed, incomplete, or inaccurate due to factors
              outside our control. Always verify anything important — especially current balances
              — directly with your bank rather than relying solely on MoneyOS.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              8. Your Choices and Rights
            </h2>
            <p className="mt-3">
              <strong className="text-foreground">Disconnecting a bank.</strong> You can disconnect
              any connected bank account at any time from the Accounts screen. This removes that
              account's transaction history and revokes MoneyOS's access with Plaid immediately.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Account deletion.</strong> You may request
              deletion of your account and all associated data at any time by emailing{" "}
              <a href="mailto:odukfabian@gmail.com" className="gold-text underline">
                odukfabian@gmail.com
              </a>{" "}
              from the email address associated with your account. We will process verified
              deletion requests within 30 days. We are working to provide an in-app self-service
              deletion feature in the future.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Notifications.</strong> You can turn account
              notifications on or off at any time from your Profile settings.
            </p>
            <p className="mt-3">
              If you are a California resident, you may have additional rights under the California
              Consumer Privacy Act, including the right to know what personal information we've
              collected and to request its deletion. You can exercise these rights using the contact
              information below.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              9. Children's Privacy
            </h2>
            <p className="mt-3">
              MoneyOS is not directed at, and is not intended for use by, anyone under 18. We do not
              knowingly collect information from children.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              10. Changes to This Policy
            </h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. If we make material changes,
              we'll update the effective date above and, where appropriate, notify you directly.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">11. Contact Us</h2>
            <p className="mt-3">
              If you have questions about this Privacy Policy or want to exercise any of the rights
              described above, contact us at{" "}
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
