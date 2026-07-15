import type { NormalizedSourceJob } from "@/server/jobs/source-adapter";

const indiaLocationTerms = [
  "india",
  "bharat",
  "ahmedabad",
  "bangalore",
  "bengaluru",
  "bhubaneswar",
  "chandigarh",
  "chennai",
  "coimbatore",
  "delhi",
  "faridabad",
  "ghaziabad",
  "gurgaon",
  "gurugram",
  "hyderabad",
  "indore",
  "jaipur",
  "kochi",
  "kolkata",
  "lucknow",
  "mohali",
  "mumbai",
  "nagpur",
  "new delhi",
  "noida",
  "patna",
  "pune",
  "thiruvananthapuram",
  "trivandrum",
  "vadodara",
  "visakhapatnam",
  "vizag",
  "andhra pradesh",
  "assam",
  "bihar",
  "goa",
  "gujarat",
  "haryana",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "odisha",
  "punjab",
  "rajasthan",
  "tamil nadu",
  "telangana",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
] as const;

const nonIndiaLocationTerms = [
  "anywhere",
  "worldwide",
  "global",
  "united states",
  " usa ",
  "us only",
  "canada",
  "united kingdom",
  " uk ",
  "europe",
  "australia",
  "new zealand",
  "singapore",
  "germany",
  "france",
  "netherlands",
  "ireland",
] as const;

function normalized(value: string) {
  return ` ${value.trim().toLowerCase().replace(/[(),/|]+/g, " ").replace(/\s+/g, " ")} `;
}

function includesTerm(value: string, terms: readonly string[]) {
  return terms.some((term) => value.includes(` ${term.trim()} `));
}

/** Returns true only for locations clearly based in India, not generic or multi-country remote roles. */
export function isIndiaLocation(location: string | null | undefined) {
  const value = normalized(location ?? "");
  return includesTerm(value, indiaLocationTerms) && !includesTerm(value, nonIndiaLocationTerms);
}

export function isIndiaJob(job: Pick<NormalizedSourceJob, "location">) {
  return isIndiaLocation(job.location);
}

/** Preserves an Indian city/state preference while preventing an overseas profile location from driving search. */
export function indiaSearchLocation(preferredLocation: string | null | undefined) {
  const preferred = preferredLocation?.trim() ?? "";
  if (!isIndiaLocation(preferred)) return "India";
  return /\bindia\b/i.test(preferred) ? preferred : `${preferred}, India`;
}
