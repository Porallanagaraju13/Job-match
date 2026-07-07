import "server-only";

import type { ExtractedProfile } from "@/server/resumes/extract-profile";
import { extractedProfileSchema } from "@/server/resumes/extract-profile";
import { inferTargetRoles } from "@/server/resumes/role-inference";

const skillCatalog = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Angular",
  "Vue",
  "Redux",
  "Node.js",
  "Express",
  "Python",
  "Pandas",
  "NumPy",
  "scikit-learn",
  "TensorFlow",
  "PyTorch",
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
  "Firebase",
  "Supabase",
  "Prisma",
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
  "UX Design",
  "Product Design",
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
  "Social Media Marketing",
  "Product Management",
  "Agile",
  "Scrum",
  "REST API",
  "GraphQL",
  "Testing",
  "Selenium",
  "Playwright",
  "Cypress",
  "Jest",
  "CI/CD",
  "Jenkins",
  "React Native",
  "Flutter",
  "Android",
  "iOS",
  "Swift",
  "Kotlin",
  "WordPress",
  "Shopify",
  "CRM",
];

const sectionHeaders = [
  "summary",
  "profile",
  "objective",
  "skills",
  "technical skills",
  "core skills",
  "key skills",
  "experience",
  "work experience",
  "professional experience",
  "employment history",
  "work history",
  "employment",
  "education",
  "projects",
  "academic projects",
  "personal projects",
  "certifications",
  "certificates",
  "achievements",
  "awards",
  "links",
  "contact",
];

const rolePattern =
  /\b(engineer|developer|designer|analyst|manager|consultant|specialist|marketer|architect|administrator|scientist|intern|lead|executive|associate|tester|qa|devops)\b/i;

const monthNumbers: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/^[-*\u2022#\s]+/, "")
    .replace(/[:\-\u2013\u2014]+$/, "")
    .trim();
}

function isSectionHeader(line: string) {
  const header = normalizeHeader(line);
  return line.length <= 60 && sectionHeaders.includes(header);
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
  const start = lines.findIndex((line) => headerNames.some((header) => normalizeHeader(line) === header));
  if (start === -1) return "";

  const end = lines.findIndex((line, index) => index > start && isSectionHeader(line));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}

function findSummary(lines: string[], fallbackText: string) {
  const explicit = sectionText(lines, ["summary", "profile", "objective"]);
  if (explicit) return explicit.slice(0, 900);

  return (
    lines
      .filter((line) => line.length > 60 && !line.includes("@") && !isSectionHeader(line))
      .slice(0, 3)
      .join(" ")
      .slice(0, 900) || fallbackText.slice(0, 500)
  );
}

function findSkills(text: string, lines: string[]) {
  const haystack = text.toLowerCase();
  const catalogMatches = skillCatalog.filter((skill) => {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "i").test(haystack);
  });

  const skillSection = sectionText(lines, ["skills", "technical skills", "core skills", "key skills"]);
  const sectionMatches = skillSection
    .split(/[,|\u2022\u00b7;]+|\n/)
    .map((skill) => skill.replace(/^[A-Za-z /&-]{2,28}:\s*/, ""))
    .map((skill) => normalizeWhitespace(skill))
    .filter((skill) => /^[A-Za-z0-9+#./ -]{2,40}$/.test(skill));

  return unique([...catalogMatches, ...sectionMatches]).slice(0, 50);
}

function findHeadline(lines: string[], skills: string[]) {
  const titleLine = lines
    .slice(0, 18)
    .find((line) => rolePattern.test(line) && line.length <= 100 && !line.includes("@") && !isSectionHeader(line));
  if (titleLine) return titleLine;

  return inferTargetRoles({ skills })[0] ?? "";
}

function findLocation(lines: string[]) {
  const labeled = lines.find((line) => /\b(location|address)\b\s*[:\-]/i.test(line));
  if (labeled) return normalizeWhitespace(labeled.replace(/^.*?\b(location|address)\b\s*[:\-]\s*/i, ""));

  const knownPlaces =
    /\b(Hyderabad|Bengaluru|Bangalore|Chennai|Mumbai|Pune|Delhi|Noida|Gurgaon|Gurugram|Kolkata|Ahmedabad|Remote|San Francisco|New York|London)\b/i;
  return lines.find((line) => knownPlaces.test(line) && line.length < 100) ?? "";
}

function findDateRange(line: string) {
  return line.match(
    /((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)?\.?\s?\d{4})\s*(?:-|\u2013|\u2014|to)\s*((?:Present|Current|Now)|(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)?\.?\s?\d{4})/i,
  );
}

function datePartToIso(value: string | undefined) {
  if (!value || /present|current|now/i.test(value)) return null;
  const normalized = value.replace(".", "").trim();
  const monthYear = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const month = monthNumbers[monthYear[1].toLowerCase()] ?? "01";
    return `${monthYear[2]}-${month}-01`;
  }
  const year = normalized.match(/\d{4}/)?.[0];
  return year ? `${year}-01-01` : null;
}

function stripBullet(line: string) {
  return line.replace(/^[-*\u2022\u00b7\s]+/, "").trim();
}

function cleanRoleLine(line: string) {
  return stripBullet(line)
    .replace(findDateRange(line)?.[0] ?? "", "")
    .replace(/\s+/g, " ")
    .replace(/^[-|,\s]+|[-|,\s]+$/g, "")
    .trim();
}

function splitTitleCompany(line: string) {
  const cleaned = cleanRoleLine(line);
  const parts = cleaned
    .split(/\s+(?:at|@)\s+|\s+[-|]\s+/i)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  const title = parts.find((part) => rolePattern.test(part));
  const company = parts.find((part) => part !== title && part.length > 1);
  return { title: title ?? "", company: company ?? "" };
}

function cleanCompanyLine(line: string) {
  return stripBullet(line)
    .replace(findDateRange(line)?.[0] ?? "", "")
    .replace(/^company\s*[:\-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionAfter(source: string[], start: number) {
  const descriptionLines: string[] = [];
  for (let index = start; index < source.length && descriptionLines.length < 6; index++) {
    const line = source[index];
    if (isSectionHeader(line)) break;
    if (rolePattern.test(line) || findDateRange(line)) break;
    const cleaned = stripBullet(line);
    if (cleaned.length > 8 && !findEmail(cleaned)) descriptionLines.push(cleaned);
  }
  return descriptionLines.join(" ").slice(0, 700);
}

function extractExperience(lines: string[]) {
  const section = sectionText(lines, [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
  ]);
  const source = section ? linesFromText(section) : lines;
  const experiences: ExtractedProfile["experiences"] = [];

  for (let index = 0; index < source.length; index++) {
    const line = source[index];
    if (isSectionHeader(line)) continue;

    const nextLine = source[index + 1] ?? "";
    const previousLine = source[index - 1] ?? "";
    const dateRange = findDateRange(`${line} ${nextLine}`);
    const split = splitTitleCompany(line);
    let title = split.title;
    let company = split.company;
    let descriptionStart = index + 1;

    if (!title && rolePattern.test(line)) {
      title = cleanRoleLine(line);
    }

    if (!company && title && nextLine && !rolePattern.test(nextLine) && !isSectionHeader(nextLine)) {
      company = cleanCompanyLine(nextLine);
      descriptionStart = index + 2;
    }

    if (!title && dateRange && rolePattern.test(previousLine)) {
      title = cleanRoleLine(previousLine);
      company = cleanCompanyLine(line);
      descriptionStart = index + 1;
    }

    if (!title || title.length > 100) continue;

    const key = `${title}|${company}`.toLowerCase();
    if (experiences.some((experience) => `${experience.title}|${experience.company}`.toLowerCase() === key)) {
      continue;
    }

    experiences.push({
      company: company || "Company not specified",
      title,
      startDate: datePartToIso(dateRange?.[1]),
      endDate: datePartToIso(dateRange?.[2]),
      description: descriptionAfter(source, descriptionStart),
    });
    if (experiences.length >= 8) break;
  }

  return experiences;
}

function extractEducation(lines: string[]) {
  const section = sectionText(lines, ["education"]);
  const source = section ? linesFromText(section) : lines;
  return source
    .filter((line) => /\b(university|college|institute|school|b\.?tech|m\.?tech|bachelor|master|degree|diploma|mba|b\.?sc|m\.?sc)\b/i.test(line))
    .slice(0, 6)
    .map((line) => ({
      institution:
        line
          .replace(/\b(bachelor|master|degree|diploma|b\.?tech|m\.?tech|b\.?sc|m\.?sc|mba).*$/i, "")
          .trim() || line,
      degree: line.match(/\b(Bachelor|Master|B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|MBA|Degree|Diploma)\b/i)?.[0] ?? "",
      fieldOfStudy:
        line.match(/\b(Computer Science|Information Technology|Electronics|Marketing|Finance|Data Science|Mechanical|Civil)\b/i)?.[0] ?? "",
    }));
}

function extractProjects(lines: string[]) {
  const section = sectionText(lines, ["projects", "academic projects", "personal projects"]);
  return linesFromText(section)
    .filter((line) => line.length > 8)
    .slice(0, 8)
    .map((line) => {
      const cleaned = stripBullet(line);
      return {
        name: cleaned.split(/[:|-]/)[0].slice(0, 100).trim() || "Project",
        description: cleaned.slice(0, 700),
        link: cleaned.match(/https?:\/\/\S+/)?.[0] ?? "",
      };
    });
}

function extractCertifications(lines: string[]) {
  const section = sectionText(lines, ["certifications", "certificates"]);
  return linesFromText(section)
    .filter((line) => line.length > 4)
    .slice(0, 10)
    .map((line) => ({
      name: stripBullet(line).slice(0, 160),
      issuer: line.match(/\b(?:by|from|issued by)\s+(.+)$/i)?.[1]?.slice(0, 80) ?? "",
      date: datePartToIso(line.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s?\d{4}\b/i)?.[0]),
    }));
}

export function extractProfileFromText(text: string, originalName: string): ExtractedProfile {
  const cleanText = normalizeWhitespace(text);
  const lines = linesFromText(text);
  const skills = findSkills(cleanText, lines);
  const fullName = findName(lines);
  const headline = findHeadline(lines, skills);
  const email = findEmail(cleanText);
  const phone = findPhone(cleanText);
  const experiences = extractExperience(lines);
  const education = extractEducation(lines);
  const projects = extractProjects(lines);
  const certifications = extractCertifications(lines);
  const summary = findSummary(lines, cleanText) || `Profile draft created from ${originalName}.`;
  const targetRoles = inferTargetRoles({ headline, skills, experiences, summary });

  return extractedProfileSchema.parse({
    fullName,
    headline,
    email,
    phone,
    location: findLocation(lines),
    summary,
    skills,
    targetRoles,
    experiences,
    education,
    projects,
    certifications,
    confidence: {
      localTextExtraction: cleanText.length > 300 ? 0.86 : 0.45,
      fullName: fullName ? 0.75 : 0.2,
      email: email ? 0.95 : 0.2,
      phone: phone ? 0.82 : 0.2,
      skills: skills.length ? 0.82 : 0.25,
      targetRoles: targetRoles.length ? 0.78 : 0.2,
      experiences: experiences.length ? 0.72 : 0.25,
    },
  });
}
