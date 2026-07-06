export type JobSource = string;
export type WorkMode = "Remote" | "Hybrid" | "On-site";
export type JobStatus = "open" | "closed";

export type Job = {
  id: string;
  source: JobSource;
  externalId: string;
  company: string;
  companyInitial: string;
  companyColor: string;
  title: string;
  location: string;
  workMode: WorkMode;
  employmentType: "Full-time" | "Contract";
  seniority: string;
  salary: string;
  tags: string[];
  matchScore: number;
  matchReasons: string[];
  postedLabel: string;
  postedAt: string;
  description: string;
  applyUrl: string;
  status: JobStatus;
};

export type ApplicationState =
  | "draft"
  | "needs_input"
  | "ready_for_review"
  | "submitted"
  | "interview"
  | "failed";

export type Application = {
  id: string;
  jobId: string;
  company: string;
  role: string;
  state: ApplicationState;
  updatedLabel: string;
  source: JobSource;
  nextAction: string;
};

export type Activity = {
  id: string;
  type: "jobs" | "saved" | "application" | "profile";
  title: string;
  detail: string;
  time: string;
};

export type ProfileDraft = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  targetRoles: string[];
  experiences: Array<{
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    link: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string | null;
  }>;
};
