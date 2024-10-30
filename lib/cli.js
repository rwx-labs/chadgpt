const { program } = require("commander");
const IRC = require("irc-framework");
const Mustache = require("mustache");
const wildcard = require("wildcard");
const Anthropic = require("@anthropic-ai/sdk");

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

  const anthropic = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"], // This is the default and can be omitted
  });

  const client = new IRC.Client(ircConfig);
  const logger = createLogger("chadgpt");

  let HIGHLIGHTED_MESSAGE;

  client.on("message", function(event) {
    logger.debug("%o", event);
  });

  client.on("nick in use", function(event) {
    const newNick = event.nick.concat("_");

    logger.info(
      `Nick \`${event.nick}' is already in use - switching to \`${newNick}'`
    );

    client.changeNick(newNick);
  });

  client.on("nick", function(event) {
    if (event.nick == client.user.nick) {
      logger.info("I changed nickname to `%s'", event.new_nick);

      // Recompile the pattern for highlighted messages.
      HIGHLIGHTED_MESSAGE = new RegExp(`^${event.new_nick}[,:] (?<msg>.*)`);
    } else {
      logger.info("`%s' changed nick to `%s'", event.nick, event.new_nick);
    }
  });

  client.on("registered", function(event) {
    logger.info("Connected and registered with nick `%s'", event.nick);

    HIGHLIGHTED_MESSAGE = new RegExp(`^${event.nick}[,:] (?<msg>.*)`);

    for (const channel of ircConfig.channels) {
      logger.info(`Joining channel \`${channel}'`);

      client.join(channel);
    }
  });

  client.on("privmsg", function(event) {
    const ignored_nicks = ircConfig["ignored_nicks"];

    // Skip responding to ignored nicknames.
    if (ignored_nicks.some((nick) => wildcard(nick, event.nick))) {
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

      const now = new Date();
      const templatedMessages = messages.map((m) => {
        return {
          role: m["role"],
          content: Mustache.render(m["content"], {
            nick: event.nick,
            channel: event.target,
            message: msg,
            rawMessage: event.message,
            dateString: now.toString(),
            dateISOString: now.toISOString(),
            dateUTCString: now.toUTCString(),
          }),
        };
      });

      logger.debug(
        "Requesting completion using instructions: %j",
        templatedMessages
      );

      const system = `You are Claude, a large language model trained by Anthropic. You are a domain expert in many advanced topics. You prefer to speak English or Danish. You answer as concisely and in as few lines as possible. Your answer can't be more than 6 lines. The current date and time is ${now.dateUTCString}.`;

      const completion = (async () =>
        await anthropic.messages.create({
          model,
          messages: templatedMessages,
          temperature,
          max_tokens,
          system,
          top_p,
          frequency_penalty,
          presence_penalty,
        }))();

      completion
        .then(function(c) {
          const content = c.content;

          if (content.length > 0) {
            console.log(c.content);
            let content = c.content[0];

            let text = removeRedundantNewlines(
              markdownToText(content.text).trim()
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
                `${event.nick}: .. (${lines.length - maxLines
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

  client.on("quit", function(event) {
    if (
      ircConfig.keepnick &&
      client.user.nick != ircConfig.nick &&
      event.nick == ircConfig.nick
    ) {
      // The user with our preferred nickname just quit, let's take it!
      logger.info(
        "`%s' just quit - trying to take over the nickname!",
        event.nick
      );
      client.changeNick(ircConfig.nick);
    }
  });

  client.on("nick", function(event) {
    if (
      ircConfig.keepnick &&
      client.user.nick != ircConfig.nick &&
      event.nick == ircConfig.nick
    ) {
      // The user with our preferred nickname just changed name, let's take it!
      logger.info(
        "`%s' just changed nickname to `%s' - trying to take over the old nickname!",
        event.nick,
        event.new_nick
      );
      client.changeNick(ircConfig.nick);
    }
  });

  logger.info("Connecting to %s:%d ..", ircConfig.host, ircConfig.port);
  client.connect();
};
