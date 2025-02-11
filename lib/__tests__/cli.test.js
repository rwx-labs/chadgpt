import { main } from "../cli.js";

describe("cli", () => {
  it("should fail when using invalid config path", async () => {
    const argv = ["bun", "chadgpt", "-c", "invalidconfigfile.yaml"];

    // `expect().rejects.toThrow()` is broken in Bun v1.2:
    // https://github.com/oven-sh/bun/issues/5602
    let error;

    try {
      await main(argv);
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
  });
});
