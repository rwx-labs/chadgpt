import fs from "node:fs/promises";
import path from "node:path";

import Mustache from "mustache";
import YAML from "yaml";
import { Client } from "irc-framework";
import OpenAI, { OpenAIApi } from "openai";

import logging from "./chadgpt/logging.js";

const logger = logging.createLogger("chadgpt");
const configPath = path.join(process.cwd(), "config.yaml");

logger.debug("Loading configuration file `%s'", configPath);
const config = await fs.readFile(configPath, "utf8").then(YAML.parse);
logger.debug("Loaded configuration file");

// Set up the IRC client
const ircConfig = config["irc"];
const client = new Client(ircConfig);

// Set op tne OpenAI API client
const openaiConfig = config["openai"];
const openai = new OpenAIApi(
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
  const result = event.message.match(HIGHLIGHTED_MESSAGE);

  if (result) {
    const msg = result[1];
    const {
      model,
      prompt,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
    } = openaiConfig;
    const templatedPrompt = Mustache.render(prompt, {
      nick: event.nick,
      channel: event.target,
      message: msg,
      rawMessage: event.message,
    });
    logger.debug("Requesting completion using prompt: %o", templatedPrompt);
    const completion = (async () =>
      await openai.createCompletion({
        model,
        prompt: templatedPrompt,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
      }))();

    completion.then(function (c) {
      const choices = c.data.choices;

      if (choices.length > 0) {
        console.log(choices[0].text);
        client.say(event.target, `${event.nick}: ${choices[0].text.trim()}`);
      }

      console.log(event, completion);
    });
  }
});

logger.info("Connecting to %s:%d ..", ircConfig["host"], ircConfig["port"]);
client.connect();
