const fs = require("fs");
const path = require("path");

const YAML = require("yaml");

const messageUtils = require("../message_utils.js");
const fixturesPath = (...paths) => path.join(__dirname, "fixtures", ...paths);
const messageTests = YAML.parse(
  fs.readFileSync(fixturesPath("messages.yaml"), "utf8")
);

describe("markdownToText", () => {
  for (const test of messageTests) {
    it(test.it, () => {
      const result = messageUtils.removeRedundantNewlines(
        messageUtils.markdownToText(test.original)
      );
      const expected_output = test.output;

      expect(result).toBe(expected_output);
    });
  }
});
