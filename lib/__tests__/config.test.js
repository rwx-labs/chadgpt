import { expect, it, describe } from "bun:test";
import { fileURLToPath } from "url";
import path, { dirname } from "node:path";

import { Config, IrcConfig, OpenaiConfig, ValidationError } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesPath = (...paths) => path.join(__dirname, "fixtures", ...paths);

describe("OpenaiConfig", () => {
  it("should fail validation when no model", () => {
    expect(() => OpenaiConfig.from({})).toThrow(ValidationError);
  });

  it("should not fail when model", () => {
    expect(() => OpenaiConfig.from({ model: "gpt-3.5-turbo" })).toThrow(
      ValidationError
    );
  });
});

describe("config", () => {
  it("should load the projects example config file", async () => {
    const configPath = path.join(__dirname, "../../config.yaml");
    const config = await Config.load(configPath);

    expect(config).toBeInstanceOf(Config);
    expect(config).toHaveProperty("irc");
    expect(config.irc).toBeInstanceOf(IrcConfig);
  });

  it("should fail when a config is empty", async () => {
    const configPath = fixturesPath("config-empty.yaml");

    // `expect().rejects.toThrow()` is broken in Bun v1.2:
    // https://github.com/oven-sh/bun/issues/5602
    let error;

    try {
      await Config.load(configPath);
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(ValidationError);
  });
});
