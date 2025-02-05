import { main } from "../cli.js";

describe("cli", () => {
  it("should fail when using invalid config path", () => {
    const argv = ["node", "chadgpt", "-c", "invalidconfigfile.yaml"];

    expect(async () => await main(argv)).rejects.toThrow();
  });
});
