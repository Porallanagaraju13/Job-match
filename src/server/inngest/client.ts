import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "jobmatch",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
