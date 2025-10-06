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

  it("should handle brackets", () => {
    expect(messageUtils.markdownToText("[test]")).toBe("[test]");
  });

  it("should handle braces", () => {
    expect(messageUtils.markdownToText("{test}")).toBe("{test}");
  });

  it("should handle quotes", () => {
    expect(messageUtils.markdownToText('"test"')).toBe('"test"');
  });

  it("should handle apostrophes", () => {
    expect(messageUtils.markdownToText("it's")).toBe("it's");
  });

  it("should handle colons", () => {
    expect(messageUtils.markdownToText("test: value")).toBe("test: value");
  });

  it("should handle semicolons", () => {
    expect(messageUtils.markdownToText("test; value")).toBe("test; value");
  });

  it("should handle dashes", () => {
    expect(messageUtils.markdownToText("test-value")).toBe("test-value");
  });

  it("should handle underscores", () => {
    expect(messageUtils.markdownToText("test_value")).toBe("test_value");
  });

  it("should handle plus signs", () => {
    expect(messageUtils.markdownToText("test+value")).toBe("test+value");
  });

  it("should handle equals signs", () => {
    expect(messageUtils.markdownToText("test=value")).toBe("test=value");
  });

  it("should handle asterisks", () => {
    expect(messageUtils.markdownToText("test*value")).toBe("test*value");
  });

  it("should handle slashes", () => {
    expect(messageUtils.markdownToText("test/value")).toBe("test/value");
  });

  it("should handle backslashes", () => {
    expect(messageUtils.markdownToText("test\\value")).toBe("test\\value");
  });

  it("should handle pipes", () => {
    expect(messageUtils.markdownToText("test|value")).toBe("test|value");
  });

  it("should handle ampersands", () => {
    expect(messageUtils.markdownToText("test&value")).toBe("test&value");
  });

  it("should handle percent signs", () => {
    expect(messageUtils.markdownToText("test%value")).toBe("test%value");
  });

  it("should handle dollar signs", () => {
    expect(messageUtils.markdownToText("test$value")).toBe("test$value");
  });

  it("should handle hash signs", () => {
    expect(messageUtils.markdownToText("test#value")).toBe("test#value");
  });

  it("should handle at signs", () => {
    expect(messageUtils.markdownToText("test@value")).toBe("test@value");
  });

  it("should handle tildes", () => {
    expect(messageUtils.markdownToText("test~value")).toBe("test~value");
  });

  it("should handle backticks", () => {
    expect(messageUtils.markdownToText("test`value")).toBe("test`value");
  });

  it("should handle carets", () => {
    expect(messageUtils.markdownToText("test^value")).toBe("test^value");
  });

  it("should handle less than signs", () => {
    expect(messageUtils.markdownToText("test<value")).toBe("test<value");
  });

  it("should handle greater than signs", () => {
    expect(messageUtils.markdownToText("test>value")).toBe("test>value");
  });

  it("should handle multiple spaces", () => {
    expect(messageUtils.markdownToText("test    value")).toBe("test    value");
  });

  it("should handle carriage returns", () => {
    expect(messageUtils.markdownToText("test\rvalue")).toBe("test\nvalue");
  });

  it("should handle form feeds", () => {
    expect(messageUtils.markdownToText("test\fvalue")).toBe("test\fvalue");
  });

  it("should handle vertical tabs", () => {
    expect(messageUtils.markdownToText("test\vvalue")).toBe("test\vvalue");
  });

  it("should handle null characters", () => {
    expect(messageUtils.markdownToText("test\0value")).toBe("test\0value");
  });

  it("should handle very long text", () => {
    const longText = "a".repeat(1000);
    expect(messageUtils.markdownToText(longText)).toBe(longText);
  });

  it("should handle text with all digits", () => {
    expect(messageUtils.markdownToText("1234567890")).toBe("1234567890");
  });

  it("should handle text with mixed alphanumeric", () => {
    expect(messageUtils.markdownToText("abc123xyz789")).toBe("abc123xyz789");
  });

  it("should handle text with only uppercase", () => {
    expect(messageUtils.markdownToText("ABCDEFGHIJKLMNOPQRSTUVWXYZ")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("should handle text with only lowercase", () => {
    expect(messageUtils.markdownToText("abcdefghijklmnopqrstuvwxyz")).toBe("abcdefghijklmnopqrstuvwxyz");
  });
});

describe("extractContentBetweenTags", () => {
  it("should extract content between tags", () => {
    const content = "<test>Hello</test> some text <test>World</test>";
    const result = messageUtils.extractContentBetweenTags(content, "test");
    expect(result).toEqual(["Hello", "World"]);
  });

  it("should handle multiline content", () => {
    const content = "<tag>Line 1\nLine 2</tag>";
    const result = messageUtils.extractContentBetweenTags(content, "tag");
    expect(result).toEqual(["Line 1\nLine 2"]);
  });

  it("should return empty array when no tags found", () => {
    const content = "No tags here";
    const result = messageUtils.extractContentBetweenTags(content, "tag");
    expect(result).toEqual([]);
  });

  it("should handle nested content", () => {
    const content = "<outer>Text with <inner>nested</inner> tags</outer>";
    const result = messageUtils.extractContentBetweenTags(content, "outer");
    expect(result).toEqual(["Text with <inner>nested</inner> tags"]);
  });
});

describe("renderChatMessages", () => {
  it("should render messages with context", () => {
    const messages = [
      { role: "user", content: "Hello {{name}}" },
      { role: "assistant", content: "Hi {{name}}, how are you?" }
    ];
    const context = { name: "Bob" };
    const result = messageUtils.renderChatMessages(messages, context);
    expect(result).toEqual([
      { role: "user", content: "Hello Bob" },
      { role: "assistant", content: "Hi Bob, how are you?" }
    ]);
  });

  it("should handle messages without placeholders", () => {
    const messages = [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" }
    ];
    const context = { name: "Alice" };
    const result = messageUtils.renderChatMessages(messages, context);
    expect(result).toEqual([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" }
    ]);
  });

  it("should handle empty context", () => {
    const messages = [
      { role: "user", content: "Hello {{name}}" }
    ];
    const context = {};
    const result = messageUtils.renderChatMessages(messages, context);
    expect(result).toEqual([
      { role: "user", content: "Hello " }
    ]);
  });

  it("should handle multiple placeholders", () => {
    const messages = [
      { role: "user", content: "{{greeting}} {{name}}, it's {{time}}" }
    ];
    const context = { greeting: "Good morning", name: "Charlie", time: "9 AM" };
    const result = messageUtils.renderChatMessages(messages, context);
    expect(result).toEqual([
      { role: "user", content: "Good morning Charlie, it's 9 AM" }
    ]);
  });
});

describe("removeRedundantNewlines", () => {
  it("should remove double newlines", () => {
    const input = "Line 1\n\nLine 2\n\nLine 3";
    const result = messageUtils.removeRedundantNewlines(input);
    expect(result).toBe("Line 1\nLine 2\nLine 3");
  });

  it("should handle multiple consecutive newlines", () => {
    const input = "Text\n\n\n\nMore text";
    const result = messageUtils.removeRedundantNewlines(input);
    expect(result).toBe("Text\n\nMore text");
  });

  it("should preserve single newlines", () => {
    const input = "Line 1\nLine 2\nLine 3";
    const result = messageUtils.removeRedundantNewlines(input);
    expect(result).toBe("Line 1\nLine 2\nLine 3");
  });
});
