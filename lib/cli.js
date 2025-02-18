import { program } from "commander";

import { VERSION } from "./version.js";
import { Config } from "./config.js";
import { createLogger } from "./logging.js";
import { createLlmClient } from "./llm.ts";
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
  const llmConfig = config.llm;
  const llm = createLlmClient(llmConfig);
  const logger = createLogger("chadgpt");
  const bot = new IrcBot(ircConfig, llm, llmConfig);

  // Register the interrupt signal handler.
  // process.on("SIGINT", () => {
  //   logger.info("SIGINT signal received (CTRL+C). Shutting down gracefully..");

  //   bot.shutdown();

  //   logger.info("Cleanup finished. Exiting.");
  //   process.exit(0);
  // });

  logger.info("Connecting to %s:%d ..", ircConfig.host, ircConfig.port);
  bot.connect();
  logger.info("after bot.connect()");
}
