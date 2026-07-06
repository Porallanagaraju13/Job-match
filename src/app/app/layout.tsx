import { AppShell } from "@/components/app/app-shell";
import { getAppContext } from "@/server/app-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getAppContext();
  return (
    <AppShell
      userName={context.profile.fullName}
      userEmail={context.profile.email}
      needsResume={!context.hasResume}
      dailyUsed={context.dailyUsed}
      dailyLimit={context.dailyLimit}
    >
      {children}
    </AppShell>
  );
}
