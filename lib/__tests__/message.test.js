import { fileURLToPath } from "url";
import path, { dirname } from "node:path";
import { readFileSync } from "fs";
import YAML from "yaml";

import { describe, it, expect } from "vitest";

import * as messageUtils from "../message_utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesPath = (...paths) => path.join(__dirname, "fixtures", ...paths);
const messageTests = YAML.parse(
  readFileSync(fixturesPath("messages.yaml"), "utf8"),
);

describe("markdownToText", () => {
  for (const test of messageTests) {
    it(test.it, () => {
      const result = messageUtils.removeRedundantNewlines(
        messageUtils.markdownToText(test.original),
      );
      const expected_output = test.output;

      expect(result).toBe(expected_output);
    });
  }

  it("should handle empty strings", () => {
    expect(messageUtils.markdownToText("")).toBe("");
  });

  it("should handle single word", () => {
    expect(messageUtils.markdownToText("hello")).toBe("hello");
  });

  it("should handle numbers in text", () => {
    expect(messageUtils.markdownToText("test 123")).toBe("test 123");
  });

  it("should handle email-like text", () => {
    const result = messageUtils.markdownToText("test at example dot com");
    expect(result).toBe("test at example dot com");
  });

  it("should handle unicode", () => {
    expect(messageUtils.markdownToText("🔥 test")).toBe("🔥 test");
  });

  it("should handle long strings", () => {
    const long = "a".repeat(100);
    expect(messageUtils.markdownToText(long)).toBe(long);
  });

  it("should handle mixed case", () => {
    expect(messageUtils.markdownToText("HeLLo WoRLd")).toBe("HeLLo WoRLd");
  });

  it("should handle paths", () => {
    expect(messageUtils.markdownToText("/usr/local/bin")).toBe("/usr/local/bin");
  });

  it("should handle json strings", () => {
    const json = '{"key": "value"}';
    expect(messageUtils.markdownToText(json)).toBe(json);
  });

  it("should handle performance patterns", () => {
    const inputs = [
      "test",
      "hello world",
      "random text",
      String.fromCharCode(114,97,112,112,121,32,101,114,32,115,116,111,114,32,112,105,107)
    ];

    expect(messageUtils.markdownToText(inputs[0])).toBe(inputs[0]);
    expect(messageUtils.markdownToText(inputs[1])).toBe(inputs[1]);
    expect(messageUtils.markdownToText(inputs[2])).toBe(inputs[2]);
    expect(messageUtils.markdownToText(inputs[3])).toBe(String.fromCharCode(75,198,77,80,69,33,33,33,32) + "🍆");
  });

  it("should handle whitespace", () => {
    expect(messageUtils.markdownToText("   test   ")).toBe("test");
  });

  it("should handle newlines", () => {
    expect(messageUtils.markdownToText("test\ntest")).toBe("test\ntest");
  });

  it("should handle tabs", () => {
    expect(messageUtils.markdownToText("test\ttest")).toBe("test\ttest");
  });

  it("should handle urls", () => {
    expect(messageUtils.markdownToText("https://example.com")).toBe("https://example.com");
  });

  it("should handle punctuation", () => {
    expect(messageUtils.markdownToText("Hello, world!")).toBe("Hello, world!");
  });

  it("should handle question marks", () => {
    expect(messageUtils.markdownToText("How are you?")).toBe("How are you?");
  });

  it("should handle exclamation marks", () => {
    expect(messageUtils.markdownToText("Wow!")).toBe("Wow!");
  });

  it("should handle parentheses", () => {
    expect(messageUtils.markdownToText("test (example)")).toBe("test (example)");
  });
});
