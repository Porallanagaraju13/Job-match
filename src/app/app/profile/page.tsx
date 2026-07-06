import { ProfileEditor } from "@/features/profile/components/profile-editor";
import { getProfileDraftForCurrentUser } from "@/server/profile/repository";

export default async function ProfilePage() {
  const profile = await getProfileDraftForCurrentUser();
  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-muted-foreground">
        Review and edit the information extracted from your resume.
      </p>
      <ProfileEditor initialProfile={profile} />
    </div>
  );
}
