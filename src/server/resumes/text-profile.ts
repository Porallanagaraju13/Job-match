import "server-only";

import type { ExtractedProfile } from "@/server/resumes/extract-profile";
import { extractedProfileSchema } from "@/server/resumes/extract-profile";

const skillCatalog = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "Python",
  "Django",
  "FastAPI",
  "Java",
  "Spring Boot",
  "C#",
  ".NET",
  "PHP",
  "Laravel",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Git",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Figma",
  "UI/UX",
  "Machine Learning",
  "Deep Learning",
  "LLM",
  "OpenAI",
  "LangChain",
  "Data Analysis",
  "Power BI",
  "Tableau",
  "Excel",
  "SEO",
  "Google Ads",
  "Meta Ads",
  "Digital Marketing",
  "Content Marketing",
  "Product Management",
  "Agile",
  "Scrum",
  "REST API",
  "GraphQL",
  "Testing",
  "CI/CD",
];

const sectionHeaders = [
  "summary",
  "profile",
  "objective",
  "skills",
  "technical skills",
  "experience",
  "work experience",
  "employment",
  "education",
  "projects",
  "certifications",
  "certificates",
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function linesFromText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n| {3,}/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function findPhone(text: string) {
  const match = text.match(/(?:\+?\d[\s().-]?){9,16}/);
  return match ? normalizeWhitespace(match[0]) : "";
}

function looksLikeName(line: string) {
  if (!/^[A-Za-z][A-Za-z.' -]{2,80}$/.test(line)) return false;
  if (sectionHeaders.some((header) => line.toLowerCase().includes(header))) return false;
  const words = line.split(/\s+/);
  return words.length >= 2 && words.length <= 4;
}

function findName(lines: string[]) {
  return (
    lines
      .slice(0, 12)
      .find((line) => looksLikeName(line) && !line.includes("@") && !/\d/.test(line)) ?? ""
  );
}

function sectionText(lines: string[], headerNames: string[]) {
  const start = lines.findIndex((line) =>
    headerNames.some((header) => line.toLowerCase().replace(/[:\-]+$/, "") === header),
  );
  if (start === -1) return "";

  const end = lines.findIndex(
    (line, index) =>
      index > start &&
      sectionHeaders.some((header) => line.toLowerCase().replace(/[:\-]+$/, "") === header),
  );

  return lines.slice(start + 1, end === -1 ? lines.length : end).join(" ");
}

function findSummary(lines: string[], fallbackText: string) {
  const explicit = sectionText(lines, ["summary", "profile", "objective"]);
  if (explicit) return explicit.slice(0, 700);

  return lines
    .filter((line) => line.length > 60 && !line.includes("@"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 700) || fallbackText.slice(0, 500);
}

function findSkills(text: string, lines: string[]) {
  const haystack = text.toLowerCase();
  const catalogMatches = skillCatalog.filter((skill) => {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "i").test(haystack);
  });

  const skillSection = sectionText(lines, ["skills", "technical skills"]);
  const sectionMatches = skillSection
    .split(/[,|•;]+/)
    .map((skill) => normalizeWhitespace(skill))
    .filter((skill) => /^[A-Za-z0-9+#./ -]{2,40}$/.test(skill));

  return unique([...catalogMatches, ...sectionMatches]).slice(0, 40);
}

function findHeadline(lines: string[], skills: string[]) {
  const titleLine = lines
    .slice(0, 16)
    .find((line) =>
      /\b(engineer|developer|designer|analyst|manager|consultant|specialist|marketer|architect|administrator)\b/i.test(
        line,
      ),
    );
  if (titleLine && titleLine.length <= 100) return titleLine;

  const lowerSkills = skills.map((skill) => skill.toLowerCase());
  if (lowerSkills.some((skill) => ["react", "next.js", "typescript"].includes(skill))) {
    return "Frontend Developer";
  }
  if (lowerSkills.some((skill) => ["python", "machine learning", "llm"].includes(skill))) {
    return "AI / Python Engineer";
  }
  if (lowerSkills.some((skill) => ["seo", "google ads", "digital marketing"].includes(skill))) {
    return "Digital Marketing Specialist";
  }
  if (lowerSkills.some((skill) => ["power bi", "tableau", "data analysis"].includes(skill))) {
    return "Data Analyst";
  }
  return "";
}

function findLocation(lines: string[]) {
  const labeled = lines.find((line) => /\b(location|address)\b\s*[:\-]/i.test(line));
  if (labeled) return normalizeWhitespace(labeled.replace(/^.*?\b(location|address)\b\s*[:\-]\s*/i, ""));

  const knownPlaces =
    /\b(Hyderabad|Bengaluru|Bangalore|Chennai|Mumbai|Pune|Delhi|Noida|Gurgaon|Gurugram|Kolkata|Ahmedabad|Remote|San Francisco|New York|London)\b/i;
  return lines.find((line) => knownPlaces.test(line) && line.length < 90) ?? "";
}

function findDateRange(line: string) {
  return line.match(
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s?\d{4})\s*(?:-|–|to)\s*((?:Present|Current|Now)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s?\d{4})/i,
  );
}

function extractExperience(lines: string[]) {
  const section = sectionText(lines, ["experience", "work experience", "employment"]);
  const source = section ? linesFromText(section) : lines;
  const experiences = [];

  for (let index = 0; index < source.length; index++) {
    const line = source[index];
    const hasTitle = /\b(engineer|developer|designer|analyst|manager|consultant|specialist|architect|intern)\b/i.test(line);
    const dateRange = findDateRange(`${line} ${source[index + 1] ?? ""}`);
    if (!hasTitle && !dateRange) continue;

    const nextLine = source[index + 1] ?? "";
    experiences.push({
      company: hasTitle ? nextLine.replace(findDateRange(nextLine)?.[0] ?? "", "").trim() || "Company not specified" : line,
      title: hasTitle ? line.replace(dateRange?.[0] ?? "", "").trim() : "Role not specified",
      startDate: null,
      endDate: null,
      description: source.slice(index + 2, index + 5).join(" ").slice(0, 500),
    });
    if (experiences.length >= 5) break;
  }

  return experiences.filter((experience) => experience.title !== "Role not specified" || experience.company !== "");
}

function extractEducation(lines: string[]) {
  const section = sectionText(lines, ["education"]);
  const source = section ? linesFromText(section) : lines;
  return source
    .filter((line) => /\b(university|college|institute|school|b\.?tech|m\.?tech|bachelor|master|degree|diploma)\b/i.test(line))
    .slice(0, 4)
    .map((line) => ({
      institution: line.replace(/\b(bachelor|master|degree|diploma|b\.?tech|m\.?tech).*$/i, "").trim() || line,
      degree: line.match(/\b(Bachelor|Master|B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|MBA|Degree|Diploma)\b/i)?.[0] ?? "",
      fieldOfStudy: line.match(/\b(Computer Science|Information Technology|Electronics|Marketing|Finance|Data Science)\b/i)?.[0] ?? "",
    }));
}

function extractProjects(lines: string[]) {
  const section = sectionText(lines, ["projects"]);
  return linesFromText(section)
    .filter((line) => line.length > 8)
    .slice(0, 5)
    .map((line) => ({
      name: line.split(/[:\-–]/)[0].slice(0, 100),
      description: line.slice(0, 500),
      link: line.match(/https?:\/\/\S+/)?.[0] ?? "",
    }));
}

function extractCertifications(lines: string[]) {
  const section = sectionText(lines, ["certifications", "certificates"]);
  return linesFromText(section)
    .filter((line) => line.length > 4)
    .slice(0, 6)
    .map((line) => ({
      name: line.slice(0, 140),
      issuer: "",
      date: null,
    }));
}

export function extractProfileFromText(text: string, originalName: string): ExtractedProfile {
  const cleanText = normalizeWhitespace(text);
  const lines = linesFromText(text);
  const skills = findSkills(cleanText, lines);

  return extractedProfileSchema.parse({
    fullName: findName(lines),
    headline: findHeadline(lines, skills),
    email: findEmail(cleanText),
    phone: findPhone(cleanText),
    location: findLocation(lines),
    summary: findSummary(lines, cleanText) || `Profile draft created from ${originalName}.`,
    skills,
    experiences: extractExperience(lines),
    education: extractEducation(lines),
    projects: extractProjects(lines),
    certifications: extractCertifications(lines),
    confidence: {
      localTextExtraction: cleanText.length > 300 ? 0.82 : 0.45,
      fullName: findName(lines) ? 0.72 : 0.2,
      email: findEmail(cleanText) ? 0.95 : 0.2,
      phone: findPhone(cleanText) ? 0.8 : 0.2,
      skills: skills.length ? 0.78 : 0.25,
    },
  });
}
