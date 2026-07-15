import { describe, expect, it } from "vitest";
import { indiaSearchLocation, isIndiaLocation } from "./india";

describe("India job location filter", () => {
  it("accepts Indian cities, states, and India-only remote roles", () => {
    expect(isIndiaLocation("Bengaluru, Karnataka")).toBe(true);
    expect(isIndiaLocation("Pune, India")).toBe(true);
    expect(isIndiaLocation("Remote (India)")).toBe(true);
  });

  it("rejects overseas, worldwide, and multi-region locations", () => {
    expect(isIndiaLocation("San Francisco, CA")).toBe(false);
    expect(isIndiaLocation("Remote (US/EU)")).toBe(false);
    expect(isIndiaLocation("Worldwide, including India")).toBe(false);
  });

  it("keeps Indian preferences but forces overseas preferences back to India", () => {
    expect(indiaSearchLocation("Hyderabad")).toBe("Hyderabad, India");
    expect(indiaSearchLocation("Mumbai, India")).toBe("Mumbai, India");
    expect(indiaSearchLocation("London, UK")).toBe("India");
  });
});
