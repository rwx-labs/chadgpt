const { program } = require("commander");
const OpenAI = require("openai");
const IRC = require("irc-framework");
const Mustache = require("mustache");
const wildcard = require("wildcard");

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

function extractContentBetweenTags(content, tag) {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "gs"); // Use 's' flag for multiline matching
  const matches = content.matchAll(regex);
  const extractedContent = [];

  for (const match of matches) {
    extractedContent.push(match[1]);
  }

  return extractedContent;
}

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

  const openai = new OpenAI.OpenAI({
    baseURL: "https://api.deepseek.com",
  });

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

    client.changeNick(newNick);
  });

  client.on("nick", function (event) {
    if (event.nick == client.user.nick) {
      logger.info("I changed nickname to `%s'", event.new_nick);

      // Recompile the pattern for highlighted messages.
      HIGHLIGHTED_MESSAGE = new RegExp(`^${event.new_nick}[,:] (?<msg>.*)`);
    } else {
      logger.info("`%s' changed nick to `%s'", event.nick, event.new_nick);
    }
  });

  client.on("registered", function (event) {
    logger.info("Connected and registered with nick `%s'", event.nick);

    HIGHLIGHTED_MESSAGE = new RegExp(`^${event.nick}[,:] (?<msg>.*)`);

    for (const channel of ircConfig.channels) {
      logger.info(`Joining channel \`${channel}'`);

      client.join(channel);
    }
  });

  client.on("privmsg", function (event) {
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
        await openai.chat.completions.create({
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
          const choices = c.choices;

          if (choices.length > 0) {
            let message = choices[0].message;
            let content = message.content;

            console.log(content);

            const thoughts = extractContentBetweenTags(content, "think");
            const answers = extractContentBetweenTags(content, "answer");
            const completeAnswer = answers.join("\n");

            let text = removeRedundantNewlines(
              markdownToText(completeAnswer).trim()
            );

            for (const thought of thoughts) {
              // Print the thoughts into the #conciousness channel
              const thoughtLines = thought.split("\n");

              console.log("thought: " + thought.trim());

              thoughtLines.forEach((line) => {
                if (line.trim().length !== 0) {
                  client.action("#thoughts", `💭 ${line.trim()}`);
                }
              });
            }

            let lines = text.split("\n");
            const maxLines = 7;

            let specialCase = lines.length == maxLines + 1;
            lines.slice(0, maxLines + specialCase).forEach((line) => {
              client.say(event.target, `${event.nick}: ${line}`);
            });

            if (!specialCase && lines.length > maxLines) {
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

  client.on("quit", function (event) {
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

  client.on("nick", function (event) {
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
