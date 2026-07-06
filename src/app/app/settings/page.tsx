import { Bell, Database, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const notifications = [
  { id: "new-matches", label: "New match digest", description: "A concise daily email with your strongest new roles." },
  { id: "application-action", label: "Application needs action", description: "Get notified when a form needs input or review." },
  { id: "application-status", label: "Application updates", description: "Submission confirmations and status changes." },
];

export default function SettingsPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Account preferences"
        title="Settings"
        description="Control notifications, privacy, data retention, and account-level actions."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Bell className="size-5 text-primary" />
              <div>
                <h2 className="font-heading text-xl font-bold">Notifications</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose what deserves your attention.</p>
              </div>
            </div>
            <div className="mt-6 divide-y">
              {notifications.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-5 py-4">
                  <div>
                    <Label htmlFor={item.id}>{item.label}</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch id={item.id} defaultChecked />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-emerald-700" />
              <div>
                <h2 className="font-heading text-xl font-bold">Privacy controls</h2>
                <p className="mt-1 text-sm text-muted-foreground">Set how long application artifacts are retained.</p>
              </div>
            </div>
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between gap-5 rounded-xl border p-4">
                <div>
                  <Label htmlFor="session-recordings">Retain automation recordings</Label>
                  <p className="mt-1 text-sm text-muted-foreground">Keep redacted session evidence for 7 days.</p>
                </div>
                <Switch id="session-recordings" defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-5 rounded-xl border p-4">
                <div>
                  <Label htmlFor="improve-matching">Use outcomes to improve my matching</Label>
                  <p className="mt-1 text-sm text-muted-foreground">Use your saves and dismissals only for your feed.</p>
                </div>
                <Switch id="improve-matching" defaultChecked />
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <Mail className="size-5 text-primary" />
            <h2 className="mt-4 font-heading text-lg font-bold">Account email</h2>
            <p className="mt-2 text-sm text-muted-foreground">alex@example.com</p>
            <Badge variant="secondary" className="mt-3 text-emerald-700">
              Verified
            </Badge>
          </Card>
          <Card className="p-5">
            <Database className="size-5 text-primary" />
            <h2 className="mt-4 font-heading text-lg font-bold">Your data</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Export your reviewed profile, saved jobs, and application history.
            </p>
            <Button variant="outline" className="mt-5 w-full rounded-full">
              Request export
            </Button>
          </Card>
          <Card className="border-destructive/25 p-5">
            <Trash2 className="size-5 text-destructive" />
            <h2 className="mt-4 font-heading text-lg font-bold">Delete account</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Permanently delete your profile, resumes, saved jobs, and application data.
            </p>
            <Button variant="destructive" className="mt-5 w-full rounded-full">
              Delete my account
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
