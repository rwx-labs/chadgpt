const { program } = require("commander");
const OpenAI = require("openai");
const IRC = require("irc-framework");
const Mustache = require("mustache");

const package_version = require("../package.json").version;
const { Config } = require("./config.js");
const { createLogger } = require("./logging.js");
const {
  markdownToText,
  removeRedundantNewlines,
} = require("./message_utils.js");

/**
 * The config file to load when no path is provided.
 */
const DEFAULT_CONFIG_PATH = "config.yaml";

module.exports = async (argv) => {
  program
    .name("chadgpt")
    .version(package_version)
    .option("-c, --config <path>", "path to config.yaml", DEFAULT_CONFIG_PATH);

  program.parse(argv);

  const opts = program.opts();
  const config_path = opts.config;
  const cfg = await Config.load(config_path);
  const ircConfig = cfg.irc;
  const openaiConfig = cfg.openai;

  const openai = new OpenAI.OpenAIApi(
    new OpenAI.Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
  );

  const client = new IRC.Client(ircConfig);
  const logger = createLogger("chadgpt");

  let HIGHLIGHTED_MESSAGE;

  client.on("message", function (event) {
    logger.debug("%o", event);
  });

  client.on("nick in use", function (event) {
    const newNick = event.nick.concat("_");

    logger.info(
      `Nick \`${event.nick}' is already in use - switching to \`${newNick}'`
    );
    ircConfig.nick = newNick;
    client.changeNick(newNick);
  });

  client.on("registered", function (event) {
    logger.info("Connected and registered with nick `%s'", event.nick);

    ircConfig.nick = event.nick;

    HIGHLIGHTED_MESSAGE = new RegExp(`^${ircConfig.nick}[,:] (?<msg>.*)`);

    for (const channel of ircConfig.channels) {
      logger.info(`Joining channel \`${channel}'`);

      client.join(channel);
    }
  });

  client.on("privmsg", function (event) {
    // Skip responding to ignored nicknames.
    if (ircConfig["ignored_nicks"].includes(event.nick)) {
      return;
    }

    const result = event.message.match(HIGHLIGHTED_MESSAGE);

    if (result) {
      const msg = result[1];
      const {
        model,
        messages,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
      } = openaiConfig;

      const templatedMessages = messages.map((m) => {
        return {
          role: m["role"],
          content: Mustache.render(m["content"], {
            nick: event.nick,
            channel: event.target,
            message: msg,
            rawMessage: event.message,
          }),
        };
      });

      logger.debug(
        "Requesting completion using instructions: %j",
        templatedMessages
      );

      const completion = (async () =>
        await openai.createChatCompletion({
          model,
          messages: templatedMessages,
          temperature,
          max_tokens,
          top_p,
          frequency_penalty,
          presence_penalty,
        }))();

      completion
        .then(function (c) {
          const choices = c.data.choices;

          if (choices.length > 0) {
            let choice = choices[0];
            let message = choice.message;

            let text = removeRedundantNewlines(
              markdownToText(message.content).trim()
            );
            console.log(text);

            let lines = text.split("\n");
            const maxLines = 7;

            lines.slice(0, maxLines).forEach((line) => {
              client.say(event.target, `${event.nick}: ${line}`);
            });

            if (lines.length > maxLines) {
              client.say(
                event.target,
                `${event.nick}: .. (${
                  lines.length - maxLines
                } lines truncated from response)`
              );
            }
          }

          console.log(event, completion);
        })
        .catch((error) => {
          console.log(error);

          client.say(
            event.target,
            `${event.nick}: OpenAI error: ${error.message}`
          );
        });
    }
  });

  logger.info("Connecting to %s:%d ..", ircConfig.host, ircConfig.port);
  client.connect();
};
