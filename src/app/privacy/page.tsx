import { LegalPage } from "@/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This beta policy explains the intended data boundaries for JobMatch. It must be reviewed by qualified counsel before a public commercial launch."
      sections={[
        {
          title: "Data we process",
          content:
            "JobMatch processes account information, resumes, reviewed profile fields, job preferences, saved roles, and application events that you choose to create.",
        },
        {
          title: "How data is used",
          content:
            "Data is used to create your profile, rank job opportunities, assist with authorized applications, enforce plan usage, and operate the service.",
        },
        {
          title: "Storage and retention",
          content:
            "Resume files are designed to be stored privately with user-scoped access. Automation artifacts use defined retention periods and may be deleted earlier from account settings.",
        },
        {
          title: "Your controls",
          content:
            "You can review and correct profile data, request an export, replace or delete resumes, and request full account deletion.",
        },
      ]}
    />
  );
}
