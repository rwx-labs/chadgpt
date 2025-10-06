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

  it("should validate returns true for valid config", () => {
    const isValid = LlmConfig.validate({ model: "test", messages: [] });
    expect(isValid).toBe(true);
  });

  it("should set default provider to anthropic", () => {
    const config = LlmConfig.from({ model: "test", messages: [] });
    expect(config.provider).toBe("anthropic");
  });

  it("should allow custom provider", () => {
    const config = LlmConfig.from({ model: "test", messages: [], provider: "openai" });
    expect(config.provider).toBe("openai");
  });

  it("should set default reasoning_method to none", () => {
    const config = LlmConfig.from({ model: "test", messages: [] });
    expect(config.reasoning_method).toBe("none");
  });

  it("should handle seed value", () => {
    const config = LlmConfig.from({ model: "test", messages: [], seed: 12345 });
    expect(config.seed).toBe(12345);
  });

  it("should handle base_url", () => {
    const config = LlmConfig.from({ model: "test", messages: [], base_url: "https://api.test.com" });
    expect(config.base_url).toBe("https://api.test.com");
  });
});

describe("IrcConfig", () => {
  it("should validate required fields", () => {
    expect(() => IrcConfig.from({})).toThrow(ValidationError);
    expect(() => IrcConfig.from({ host: "test" })).toThrow(ValidationError);
    expect(() => IrcConfig.from({ nick: "test" })).toThrow(ValidationError);
  });

  it("should create config with required fields", () => {
    const config = IrcConfig.from({ host: "irc.example.com", nick: "testbot" });
    expect(config.host).toBe("irc.example.com");
    expect(config.nick).toBe("testbot");
    expect(config.port).toBe(6697);
    expect(config.tls).toBe(true);
  });

  it("should handle optional fields", () => {
    const config = IrcConfig.from({
      host: "irc.example.com",
      nick: "testbot",
      port: 6667,
      tls: false,
      channels: ["#test"],
      ignored_nicks: ["spambot"],
      version: "custom version"
    });
    expect(config.port).toBe(6667);
    expect(config.tls).toBe(false);
    expect(config.channels).toEqual(["#test"]);
    expect(config.ignored_nicks).toEqual(["spambot"]);
    expect(config.version).toBe("custom version");
  });

  it("should validate returns true for valid config", () => {
    const isValid = IrcConfig.validate({ host: "test", nick: "bot" });
    expect(isValid).toBe(true);
  });

  it("should allow custom username", () => {
    const config = IrcConfig.from({ host: "test", nick: "bot", username: "customuser" });
    expect(config.username).toBe("customuser");
  });

  it("should set default channels to empty array", () => {
    const config = IrcConfig.from({ host: "test", nick: "bot" });
    expect(config.channels).toEqual([]);
  });

  it("should set keepnick to true by default", () => {
    const config = IrcConfig.from({ host: "test", nick: "bot" });
    expect(config.keepnick).toBe(true);
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

  it("should fail when config file is missing", async () => {
    const configPath = fixturesPath("nonexistent.yaml");
    const config = Config.load(configPath);

    await expect(config).rejects.toThrowError();
  });

  it("should fail when config missing irc section", async () => {
    const configPath = fixturesPath("config-no-irc.yaml");
    const config = Config.load(configPath);

    await expect(config).rejects.toThrowError();
  });
});
