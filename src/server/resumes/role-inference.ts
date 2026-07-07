type RoleExperience = {
  title?: string | null;
};

type RoleInferenceInput = {
  headline?: string | null;
  summary?: string | null;
  skills?: string[] | null;
  experiences?: RoleExperience[] | null;
};

const roleKeywordPattern =
  /\b(engineer|developer|designer|analyst|scientist|manager|consultant|specialist|architect|administrator|intern|lead|executive|associate|tester|qa|devops|marketer|writer|editor)\b/i;

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanRoleTitle(value: string) {
  return value
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/gi, "")
    .replace(/\b\d{4}\s*(?:-|–|—|to)\s*(?:present|current|now|\d{4})\b/gi, "")
    .replace(/\b(?:at|with)\s+[A-Z][A-Za-z0-9&.,' -]{2,}$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[-–—|,.\s]+|[-–—|,.\s]+$/g, "")
    .trim();
}

function explicitRoleCandidates(input: RoleInferenceInput) {
  const titleSources = [input.headline, ...(input.experiences ?? []).map((experience) => experience.title)]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .flatMap((value) => value.split(/\s+[|•]\s+|\s+-\s+|\s+–\s+|\s+—\s+/));

  return unique(
    titleSources
      .map(cleanRoleTitle)
      .filter((value) => value.length >= 3 && value.length <= 80 && roleKeywordPattern.test(value)),
  ).slice(0, 5);
}

function skillSet(skills: string[] | null | undefined) {
  return new Set((skills ?? []).map((skill) => skill.toLowerCase().replace(/\s+/g, " ").trim()));
}

function hasAny(skills: Set<string>, names: string[]) {
  return names.some((name) => skills.has(name));
}

function mappedRoleCandidates(input: RoleInferenceInput) {
  const skills = skillSet(input.skills);
  const summary = `${input.summary ?? ""} ${input.headline ?? ""}`.toLowerCase();
  const roles: string[] = [];

  const frontend = hasAny(skills, [
    "react",
    "next.js",
    "javascript",
    "typescript",
    "html",
    "css",
    "tailwind css",
    "redux",
    "vue",
    "angular",
  ]);
  const backend = hasAny(skills, [
    "node.js",
    "express",
    "java",
    "spring boot",
    "python",
    "django",
    "fastapi",
    "postgresql",
    "mysql",
    "mongodb",
    "rest api",
    "graphql",
  ]);
  const data = hasAny(skills, ["data analysis", "sql", "power bi", "tableau", "excel", "pandas", "numpy"]);
  const machineLearning = hasAny(skills, [
    "machine learning",
    "deep learning",
    "llm",
    "openai",
    "langchain",
    "tensorflow",
    "pytorch",
    "scikit-learn",
  ]);
  const marketing = hasAny(skills, [
    "seo",
    "google ads",
    "meta ads",
    "digital marketing",
    "content marketing",
    "social media marketing",
  ]);
  const design = hasAny(skills, ["figma", "ui/ux", "ux design", "product design"]);
  const devops = hasAny(skills, ["aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "jenkins"]);
  const qa = hasAny(skills, ["testing", "selenium", "playwright", "cypress", "jest"]);
  const product = hasAny(skills, ["product management", "agile", "scrum"]);
  const mobile = hasAny(skills, ["react native", "flutter", "android", "ios", "swift", "kotlin"]);

  if (frontend && backend) roles.push("Full Stack Developer");
  if (machineLearning) roles.push("AI Engineer", "Machine Learning Engineer");
  if (data && !machineLearning) roles.push("Data Analyst");
  if (marketing) roles.push("Digital Marketing Specialist");
  if (design) roles.push("UI/UX Designer");
  if (devops && /devops|cloud|infrastructure/.test(summary)) roles.push("DevOps Engineer");
  if (product) roles.push("Product Manager");
  if (mobile) roles.push("Mobile App Developer");
  if (frontend) roles.push("Frontend Developer");
  if (backend) roles.push("Backend Developer");
  if (qa) roles.push("QA Engineer");
  if (hasAny(skills, ["java", "spring boot"])) roles.push("Java Developer");
  if (hasAny(skills, ["python", "django", "fastapi"]) && !machineLearning) roles.push("Python Developer");

  return unique(roles);
}

export function inferTargetRoles(input: RoleInferenceInput) {
  const explicit = explicitRoleCandidates(input);
  const mapped = mappedRoleCandidates(input);
  return unique([...explicit, ...mapped, explicit.length || mapped.length ? "" : "Software Engineer"].filter(Boolean)).slice(0, 6);
}
