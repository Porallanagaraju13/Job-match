import "server-only";

import { Stagehand } from "@browserbasehq/stagehand";

export type ApplicationScan = {
  mode: "demo" | "browserbase";
  sessionId?: string;
  fields: Array<{ description: string; method: string }>;
};

export async function scanApplicationForm(url: string): Promise<ApplicationScan> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    return {
      mode: "demo",
      fields: [
        { description: "Full name input", method: "fill" },
        { description: "Email input", method: "fill" },
        { description: "Resume upload", method: "upload" },
        { description: "Work authorization select", method: "select" },
      ],
    };
  }

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey,
    projectId,
    model: "google/gemini-3-flash-preview",
    waitForCaptchaSolves: false,
    verbose: 0,
  });

  await stagehand.init();
  try {
    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Browserbase session did not create a page");
    await page.goto(url);
    const actions = await stagehand.observe(
      "Find every visible job application input, select, checkbox, upload control, and submit action. Do not interact with them.",
    );
    return {
      mode: "browserbase",
      sessionId: stagehand.browserbaseSessionID,
      fields: actions.map((action) => ({
        description: action.description,
        method: action.method ?? "unknown",
      })),
    };
  } finally {
    await stagehand.close();
  }
}
