import { ResumeManager } from "@/features/resumes/components/resume-manager";
import { getResumesForCurrentUser } from "@/server/resumes/repository";

export default async function ResumePage() {
  const resumes = await getResumesForCurrentUser();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Resume</h1>
      <p className="mt-1 text-muted-foreground">Manage your uploaded resumes.</p>
      <ResumeManager initialResumes={resumes} />
    </div>
  );
}
