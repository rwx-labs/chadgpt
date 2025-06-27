import { promises as fs } from "fs";
import * as YAML from "yaml";
import { createLogger } from "./logging.js";

/** The nickname to default to when no nickname is given. */
export const DEFAULT_NICKNAME = "chad";
/** The default response to give when a user sends a CTCP VERSION request. */
export const DEFAULT_VERSION_REPLY = "github.com/rwx-labs/chadgpt";
/** List of keys in the `irc` map of the configuration that are required. */
export const REQUIRED_IRC_KEYS = ["host", "nick"];
/** List of keys in the `llm` map of the configuration that are required. */
export const REQUIRED_LLM_KEYS = ["model", "messages"];

/** An error occurred when validating the supplied configuration file. */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
  }
}

/**
 * Configuration for the IRC client.
 */
export class IrcConfig {
  /**
   * The port to connect to.
   */
  port = 6697;

  /**
   * Connect using a secure connection.
   */
  tls = true;

  /**
   * The nickname to register.
   */
  nick = DEFAULT_NICKNAME;

  /**
   * Whether to change nickname to the configured one as soon as it becomes available.
   */
  keepnick = true;

  /**
   * The username to register. Defaults to the nickname.
   */
  username = this.nick;

  /**
   * The reply to send when receiving a CTCP VERSION request.
   */
  version = DEFAULT_VERSION_REPLY;

  /**
   * List of channel names to join once connected.
   * @type {string[]}
   */
  channels = [];

  /**
   * List of nicknames to ignore messages from.
   * @type {string[]}
   */
  ignored_nicks = [];

  /** Create an IrcConfig with keys from the given object.
   *
   * @throws {ValidationError} if the object does not have valid keys
   */
  static from(object) {
    IrcConfig.validate(object);

    return Object.assign(new IrcConfig(), object);
  }

  /**
   * Validates the objects keys and returns true if it can be used as an
   * IrcConfig.
   */
  static validate(object) {
    for (const key of REQUIRED_IRC_KEYS) {
      if (!(key in object)) {
        throw new ValidationError(
          `Missing configuration value for irc.${key}!`
        );
      }
    }

    return true;
  }
}

export class LlmConfig {
  /**
   * The API provider to use (openai, anthropic)
   */
  provider = "anthropic";

  /**
   * The identifier of the model to use for chat completions.
   */
  model = "claude-3-5-haiku-latest";

  /**
   * Override the base URL of the API endpoint.
   */
  base_url = null;

  /**
   * The reasoning extraction method.
   */
  reasoning_method = "none";

  /**
   * IRC channel to send thought messages to, if any.
   */
  thoughts_channel = null;

  /**
   * Seed value for deterministic output generation.
   */
  seed = null;

  max_completion_tokens = 4094;

  /** Create an LlmConfig with keys from the given object.
   *
   * @throws {ValidationError} if the object does not have valid keys
   */
  static from(object) {
    LlmConfig.validate(object);

    return Object.assign(new LlmConfig(), object);
  }

  /**
   * Validates the objects' keys and returns true if it can be used as an
   * LlmConfig.
   */
  static validate(object) {
    for (const key of REQUIRED_LLM_KEYS) {
      if (!(key in object)) {
        throw new ValidationError(
          `Missing configuration value for llm.${key}!`
        );
      }
    }

    return true;
  }
}

/**
 * The configuration for chadgpt.
 */
export class Config {
  static logger = createLogger("chadgpt.Config");

  /**
   * Construct a new Config containing an irc and llm configuration.
   *
   * @see Config.load
   */
  constructor(ircConfig, llmConfig) {
    this.irc = ircConfig;
    this.llm = llmConfig;
  }

  /**
   * Open and load the given path as a configuration file.
   *
   * @param {string} path the path to the file
   */
  static async load(path) {
    this.logger.debug("Loading configuration file `%s'", path);
    const yaml = await fs.readFile(path, "utf8").then(YAML.parse);

    const abort = (message) => {
      this.logger.error(message);
      throw new ValidationError(message);
    };

    if (yaml == null) {
      abort("The configuration does not contain a valid YAML document");
    }

    for (const key of ["irc", "llm"]) {
      if (!(key in yaml) || typeof yaml[key] != "object") {
        abort(`The configuration is missing a valid \`${key}\` object`);
      }
    }
    const ircConfig = IrcConfig.from(yaml["irc"]);
    const llmConfig = LlmConfig.from(yaml["llm"]);
    const config = new Config(ircConfig, llmConfig);

    this.logger.debug("Loaded configuration file");

    return config;
  }
}
