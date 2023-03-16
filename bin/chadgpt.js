#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const process = require("process");

const { Client } = require("irc-framework");
const Mustache = require("mustache");
const YAML = require("yaml");
const OpenAI = require("openai");

const logging = require("../lib/logging.js");

(async () => {
  const logger = logging.createLogger("chadgpt");
  const configPath =
    process.env["CONFIG_PATH"] || path.join(process.cwd(), "config.yaml");

  logger.debug("Loading configuration file `%s'", configPath);
  const config = await fs.readFile(configPath, "utf8").then(YAML.parse);
  logger.debug("Loaded configuration file");

  // Set up the IRC client
  const ircConfig = config["irc"];
  const client = new Client(ircConfig);

  // Set op tne OpenAI API client
  const openaiConfig = config["openai"];
  const openai = new OpenAI.OpenAIApi(
    new OpenAI.Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
  );

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

            let text = message.content.trim();
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
          client.say(
            event.target,
            `${event.nick}: OpenAI error: ${error.message}`
          );
        });
    }
  });

  logger.info("Connecting to %s:%d ..", ircConfig["host"], ircConfig["port"]);
  client.connect();
})();
