const path = require("path");

const {
  Config,
  IrcConfig,
  OpenaiConfig,
  ValidationError,
} = require("../config.js");

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
    const config_path = path.join(__dirname, "../../config.yaml");
    const cfg = await Config.load(config_path);

    expect(cfg).toBeInstanceOf(Config);
    expect(cfg).toHaveProperty("irc");
    expect(cfg.irc).toBeInstanceOf(IrcConfig);
  });

  it("should fail when a config is empty", async () => {
    const config_path = fixturesPath("config-empty.yaml");

    expect(async () => await Config.load(config_path)).rejects.toThrow(
      ValidationError
    );
  });
});
