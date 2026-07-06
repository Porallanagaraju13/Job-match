import { Bookmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SavedJobsList } from "@/features/jobs/components/saved-jobs-list";
import { getJobsForCurrentUser } from "@/server/jobs/repository";

export default async function SavedJobsPage() {
  const jobs = await getJobsForCurrentUser();
  return (
    <div className="space-y-8">
      <Card className="p-6 shadow-none">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          <Bookmark className="size-4" />
          Saved jobs
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold">Saved jobs</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage jobs you have bookmarked. Application status updates automatically as
          your submissions progress.
        </p>
      </Card>
      <div>
        <h2 className="font-heading text-4xl font-semibold tracking-tight">Your saved jobs</h2>
        <p className="mt-1 text-lg text-muted-foreground">Review them before you apply.</p>
      </div>
      <SavedJobsList jobs={jobs} />
    </div>
  );
}
