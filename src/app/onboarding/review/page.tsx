import { ProfileReviewForm } from "@/features/profile/components/profile-review-form";
import { getProfileDraftForCurrentUser } from "@/server/profile/repository";

export default async function ReviewProfilePage() {
  const profile = await getProfileDraftForCurrentUser();
  return <ProfileReviewForm initialProfile={profile} />;
}
