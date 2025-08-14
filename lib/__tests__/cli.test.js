import { describe, expect, test } from "vitest";

import { main } from "../cli.js";

describe("cli", () => {
  test("should fail when using invalid config path", async () => {
    const argv = ["node", "chadgpt", "-c", "invalidconfigfile.yaml"];
    const promise = main(argv);

    await expect(promise).rejects.toThrowError();
  });
});
