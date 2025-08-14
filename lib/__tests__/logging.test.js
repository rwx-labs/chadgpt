import { it, expect, describe } from "vitest";
import { createLogger } from "../logging.js";

describe("logging", () => {
  describe("createLogger", () => {
    it("should return a logging object", () => {
      const logger = createLogger("test");

      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("error");
    });
  });
});
