"use strict";
const fs = require("fs/promises");

const YAML = require("yaml");

const { createLogger } = require("./logging.js");

const DEFAULT_NICKNAME = "chad";
const DEFAULT_VERSION_REPLY = "github.com/rwx-labs/chadgpt";
const REQUIRED_IRC_KEYS = ["host", "nick"];
const REQUIRED_OPENAI_KEYS = ["model", "messages"];

class ValidationError extends Error {
  constructor(message) {
    super(message);
  }
}

class IrcConfig {
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

class OpenaiConfig {
  /**
   * The identifier of the model to use for chat completions.
   */
  model = "gpt-3.5-turbo";

  /** Create an OpenaiConfig with keys from the given object.
   *
   * @throws {ValidationError} if the object does not have valid keys
   */
  static from(object) {
    OpenaiConfig.validate(object);

    return Object.assign(new OpenaiConfig(), object);
  }

  /**
   * Validates the objects' keys and returns true if it can be used as an
   * OpenaiConfig.
   */
  static validate(object) {
    for (const key of REQUIRED_OPENAI_KEYS) {
      if (!(key in object)) {
        throw new ValidationError(
          `Missing configuration value for openai.${key}!`
        );
      }
    }

    return true;
  }
}

class Config {
  static logger = createLogger("chadgpt.Config");

  /**
   * Construct a new Config containing an irc and openai configuration.
   *
   * @see Config.load
   */
  constructor(ircConfig, openaiConfig) {
    this.irc = ircConfig;
    this.openai = openaiConfig;
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

    for (const key of ["irc", "openai"]) {
      if (!(key in yaml) || typeof yaml[key] != "object") {
        abort(`The configuration is missing a valid \`${key}\` object`);
      }
    }
    const ircConfig = IrcConfig.from(yaml["irc"]);
    const openaiConfig = OpenaiConfig.from(yaml["openai"]);
    const config = new Config(ircConfig, openaiConfig);

    this.logger.debug("Loaded configuration file");

    return config;
  }
}

module.exports = { IrcConfig, Config, ValidationError, OpenaiConfig };
