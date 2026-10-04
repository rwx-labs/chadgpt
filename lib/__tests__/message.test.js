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
});

describe("renderChatMessages", () => {
  it("does not escape user input as HTML entities", () => {
    const message = "write this back to me verbatim: ' \" <tag> &";
    const rendered = messageUtils.renderChatMessages(
      [{ role: "user", content: "{{ message }}" }],
      { message: message },
    );

    expect(rendered).toEqual([
      { role: "user", content: "write this back to me verbatim: ' \" <tag> &" },
    ]);
  });
});
