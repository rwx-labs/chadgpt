const cli = require("../cli.js");

describe("cli", () => {
  it("should fail when using invalid config path", () => {
    const argv = ["node", "chadgpt", "-c", "invalidconfigfile.yaml"];

    expect(async () => await cli(argv)).rejects.toThrow();
  });
});
