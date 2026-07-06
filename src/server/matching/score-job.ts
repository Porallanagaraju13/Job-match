export type MatchProfile = {
  skills: string[];
  targetRoles: string[];
  preferredLocations: string[];
  workModes: string[];
  seniorityLevels: string[];
  minimumSalary?: number;
};

export type MatchableJob = {
  title: string;
  description: string;
  tags: string[];
  location: string;
  workMode: string;
  seniority?: string;
  salaryMin?: number;
  postedAt?: string;
};

export type MatchResult = {
  score: number;
  components: {
    skills: number;
    role: number;
    location: number;
    seniority: number;
    compensation: number;
    recency: number;
  };
  reasons: string[];
};

const weights = {
  skills: 40,
  role: 20,
  location: 15,
  seniority: 10,
  compensation: 10,
  recency: 5,
} as const;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function tokenSet(value: string) {
  return new Set(normalize(value).split(/\s+/).filter((token) => token.length > 1));
}

function overlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0;
  let matches = 0;
  for (const value of left) if (right.has(value)) matches += 1;
  return matches / left.size;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function scoreJob(profile: MatchProfile, job: MatchableJob, now = new Date()): MatchResult {
  const jobText = tokenSet(`${job.title} ${job.description} ${job.tags.join(" ")}`);
  const skillScores: number[] = profile.skills.map((skill) => {
    const normalizedSkill = normalize(skill);
    return jobText.has(normalizedSkill) || normalize(`${job.title} ${job.description}`).includes(normalizedSkill)
      ? 1
      : 0;
  });
  const skills = skillScores.length
    ? skillScores.reduce((total, value) => total + value, 0) / skillScores.length
    : 0;

  const titleTokens = tokenSet(job.title);
  const role = profile.targetRoles.length
    ? Math.max(...profile.targetRoles.map((target) => overlap(tokenSet(target), titleTokens)))
    : 0;

  const normalizedLocation = normalize(job.location);
  const remoteMatch =
    normalize(job.workMode) === "remote" && profile.workModes.some((mode) => normalize(mode) === "remote");
  const workModeMatch = profile.workModes.some((mode) => normalize(mode) === normalize(job.workMode));
  const placeMatch = profile.preferredLocations.some((place) => {
    const normalizedPlace = normalize(place);
    return normalizedLocation.includes(normalizedPlace) || normalizedPlace.includes(normalizedLocation);
  });
  const location = remoteMatch ? 1 : workModeMatch && placeMatch ? 1 : workModeMatch || placeMatch ? 0.65 : 0;

  const seniority = job.seniority
    ? Math.max(
        0,
        ...profile.seniorityLevels.map((level) => overlap(tokenSet(level), tokenSet(job.seniority ?? ""))),
      )
    : 0.5;

  let compensation = 0.5;
  if (profile.minimumSalary && job.salaryMin) {
    compensation = job.salaryMin >= profile.minimumSalary ? 1 : job.salaryMin / profile.minimumSalary;
  } else if (job.salaryMin) {
    compensation = 0.8;
  }

  let recency = 0.5;
  if (job.postedAt) {
    const days = Math.max(0, (now.getTime() - new Date(job.postedAt).getTime()) / 86_400_000);
    recency = days <= 1 ? 1 : days <= 7 ? 0.8 : days <= 30 ? 0.4 : 0.1;
  }

  const components = {
    skills: Math.round(clamp(skills) * weights.skills),
    role: Math.round(clamp(role) * weights.role),
    location: Math.round(clamp(location) * weights.location),
    seniority: Math.round(clamp(seniority) * weights.seniority),
    compensation: Math.round(clamp(compensation) * weights.compensation),
    recency: Math.round(clamp(recency) * weights.recency),
  };
  const score = Object.values(components).reduce((total, value) => total + value, 0);

  const reasons: string[] = [];
  if (skills >= 0.6) reasons.push("Strong skills overlap");
  if (role >= 0.65) reasons.push("Target role aligned");
  if (location >= 0.8) reasons.push(`${job.workMode} preference matched`);
  if (seniority >= 0.7) reasons.push("Seniority aligned");
  if (compensation >= 1) reasons.push("Meets compensation target");
  if (recency >= 0.8) reasons.push("Recently posted");

  return { score, components, reasons: reasons.slice(0, 3) };
}
