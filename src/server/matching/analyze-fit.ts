import type { Job, ProfileDraft } from "@/lib/types";

const keywordCatalog = [
  "JavaScript", "TypeScript", "React", "Next.js", "Angular", "Vue", "Node.js", "Express",
  "Python", "Django", "FastAPI", "Java", "Spring Boot", "C#", ".NET", "PHP", "Laravel",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "AWS", "Azure", "GCP", "Docker",
  "Kubernetes", "Terraform", "Git", "REST API", "GraphQL", "Testing", "Playwright", "Cypress",
  "Machine Learning", "Data Analysis", "Power BI", "Tableau", "Excel", "Figma", "Product Management",
  "Agile", "Scrum", "SEO", "Google Ads", "Content Marketing", "React Native", "Flutter",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function containsKeyword(text: string, keyword: string) {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedKeyword = normalize(keyword);
  return normalizedText.includes(` ${normalizedKeyword} `) || normalizedText.includes(normalizedKeyword);
}

export function analyzeJobFit(profile: ProfileDraft, job: Pick<Job, "title" | "description" | "tags" | "matchScore">) {
  const jobText = [job.title, job.description, ...job.tags].join(" ");
  const detectedKeywords = keywordCatalog.filter((keyword) => containsKeyword(jobText, keyword));
  const profileText = [profile.headline, profile.summary, ...profile.skills, ...profile.targetRoles].join(" ");
  const matchedSkills = detectedKeywords.filter((keyword) => containsKeyword(profileText, keyword));
  const missingKeywords = detectedKeywords.filter((keyword) => !containsKeyword(profileText, keyword));
  const coverageScore = detectedKeywords.length
    ? Math.round((matchedSkills.length / detectedKeywords.length) * 100)
    : job.matchScore;

  const recommendations: string[] = [];
  if (missingKeywords.length) {
    recommendations.push(
      `If accurate, demonstrate evidence for ${missingKeywords.slice(0, 4).join(", ")} in your skills or experience bullets.`,
    );
  }
  if (!profile.experiences.some((experience) => /\d|%|[$£€₹]/.test(experience.description))) {
    recommendations.push("Add measurable outcomes to relevant experience bullets where you have evidence.");
  }
  if (!containsKeyword(profile.headline, job.title)) {
    recommendations.push(`Consider a truthful headline aligned with the ${job.title} role.`);
  }
  if (!recommendations.length) {
    recommendations.push("Your reviewed profile covers the primary keywords detected in this posting.");
  }

  return {
    coverageScore,
    detectedKeywords,
    matchedSkills,
    missingKeywords,
    recommendations,
  };
}
