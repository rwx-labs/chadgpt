import { expect, it, describe } from "vitest";
import { fileURLToPath } from "url";
import path, { dirname } from "node:path";

import { Config, IrcConfig, LlmConfig, ValidationError } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesPath = (...paths) => path.join(__dirname, "fixtures", ...paths);

describe("LlmConfig", () => {
  it("should fail validation when no model", () => {
    expect(() => LlmConfig.from({})).toThrow(ValidationError);
  });

  it("should not fail when model", () => {
    expect(() => LlmConfig.from({ model: "gpt-3.5-turbo" })).toThrow(
      ValidationError,
    );
  });

  it("should handle thoughts_channel configuration", () => {
    // Default value should be null when not provided
    const config = LlmConfig.from({ model: "gpt-3.5-turbo", messages: [] });
    expect(config.thoughts_channel).toBeNull();

    // Should accept string value
    const configWithThoughts = LlmConfig.from({
      model: "gpt-3.5-turbo",
      messages: [],
      thoughts_channel: "#thoughts",
    });
    expect(configWithThoughts.thoughts_channel).toBe("#thoughts");

    // Should work with other channel formats
    const configWithPrivateChannel = LlmConfig.from({
      model: "gpt-3.5-turbo",
      messages: [],
      thoughts_channel: "##internal-thoughts",
    });
    expect(configWithPrivateChannel.thoughts_channel).toBe(
      "##internal-thoughts",
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
    const config = Config.load(configPath);

    await expect(config).rejects.toThrowError();
  });
});
