import { program } from "commander";
import * as OpenAI from "openai";

import { VERSION } from "./version.js";
import { Config } from "./config.js";
import { createLogger } from "./logging.js";
import { IrcBot } from "./irc.js";

/** The config file to load when no path is provided. */
const DEFAULT_CONFIG_PATH = "config.yaml";

export async function main(argv) {
  program
    .name("chadgpt")
    .version(VERSION)
    .option("-c, --config <path>", "path to config.yaml", DEFAULT_CONFIG_PATH);

  program.parse(argv);

  const opts = program.opts();
  const configPath = opts.config;
  const config = await Config.load(configPath);
  const ircConfig = config.irc;
  const openaiConfig = config.openai;

  const openai = new OpenAI.OpenAI({
    // baseURL: "https://openrouter.ai/api/v1",
    // baseURL: "http://10.0.0.154:1234/v1"
    baseURL: "https://api.deepseek.com",
  });

  const logger = createLogger("chadgpt");
  const bot = new IrcBot(ircConfig, openai, openaiConfig);

  logger.info("Connecting to %s:%d ..", ircConfig.host, ircConfig.port);
  bot.connect();
}
