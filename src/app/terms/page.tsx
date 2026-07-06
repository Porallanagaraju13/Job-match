import { LegalPage } from "@/components/marketing/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These beta terms describe the intended operating rules for JobMatch. They are a product placeholder, not launch-ready legal advice."
      sections={[
        {
          title: "User responsibility",
          content:
            "You are responsible for reviewing the accuracy of your profile and every job application. JobMatch does not guarantee interviews, offers, or employment outcomes.",
        },
        {
          title: "Authorized use",
          content:
            "You may use JobMatch only for your own legitimate job search and must comply with employer and application-platform rules. Do not use the service to bypass security, CAPTCHA, MFA, or access controls.",
        },
        {
          title: "Generated drafts",
          content:
            "AI-generated summaries and answers are drafts. You must review and confirm them. JobMatch does not infer voluntary demographic responses or other protected personal characteristics.",
        },
        {
          title: "Subscriptions",
          content:
            "Paid features and allowances are governed by the active plan shown at checkout. Usage reservations may be released when the service cannot complete a system-controlled workflow.",
        },
      ]}
    />
  );
}
