const fs = require("fs");
const path = require("path");

const message = require("../message.js");
const fixturesPath = (...paths) => path.join(__dirname, "fixtures", ...paths);

describe("markdownToText", () => {
  it("should strip codeblocks", () => {
    const input = fs.readFileSync(fixturesPath("message-codeblock.md"), "utf8");
    const result = message.markdownToText(input);
    const expectation =
      "Sure, here's an example:\n\nconst obj = {\n  name: 'John',\n  age: 25\n};";

    expect(result).toBe(expectation);
  });
});
