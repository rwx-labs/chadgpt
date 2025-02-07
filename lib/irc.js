import IRC from "irc-framework";
import wildcard from "wildcard";

import { createLogger } from "./logging.js";
import {
  renderChatMessages,
  markdownToText,
  removeRedundantNewlines,
  extractContentBetweenTags,
} from "./message_utils.js";

export class IrcBot {
  constructor(config, llmClient, openaiConfig) {
    this.config = config;
    this.client = new IRC.Client(config);
    this.llm = llmClient;
    this.openaiConfig = openaiConfig;
    this.logger = createLogger("chadgpt");
    this.highlightedMessage = null;

    this.#setupEventHandlers();
  }

  /**
   * Sets up event handlers for various IRC events
   * @private
   */
  #setupEventHandlers() {
    this.client.on("message", (event) => this.onMessage(event));
    this.client.on("nick in use", (event) => this.onNickInUse(event));
    this.client.on("nick", (event) => this.onNickChange(event));
    this.client.on("registered", (event) => this.onRegistered(event));
    this.client.on("privmsg", (event) => this.onPrivMsg(event));
    this.client.on("quit", (event) => this.onQuit(event));
  }

  connect() {
    this.client.connect();
  }

  /**
   * Handles incoming IRC messages
   * @param {Object} event - The message event object
   */
  onMessage(event) {
    this.logger.debug("%o", event);
  }

  /**
   * Handles successful IRC registration
   * @param {Object} event - The registration event object containing nick information
   */
  onRegistered(event) {
    this.logger.info("Connected and registered with nick `%s'", event.nick);
    this.highlightedMessage = new RegExp(`^${event.nick}[,:] (?<msg>.*)`);

    for (const channel of this.config.channels) {
      this.logger.info(`Joining channel \`${channel}'`);
      this.client.join(channel);
    }
  }

  /**
   * Handles nickname changes
   * @param {Object} event - The nick change event object
   */
  onNick(event) {
    if (event.nick == this.client.user.nick) {
      this.logger.info("I changed nickname to `%s'", event.new_nick);

      // Recompile the pattern for highlighted messages.
      this.highlightedMessage = new RegExp(`^${event.new_nick}[,:] (?<msg>.*)`);
    } else if (
      this.config.keepnick &&
      this.client.user.nick != this.config.nick &&
      event.nick == this.config.nick
    ) {
      // The user with our preferred nickname just changed name, let's take it!
      this.logger.info(
        "`%s' just changed nickname to `%s' - trying to take over the old nickname!",
        event.nick,
        event.new_nick
      );
      this.client.changeNick(this.config.nick);
    } else {
      this.logger.info("`%s' changed nick to `%s'", event.nick, event.new_nick);
    }
  }

  /**
   * Handles nickname collision events
   * @param {Object} event - The nick-in-use event object
   */
  onNickInUse(event) {
    const newNick = event.nick.concat("_");

    this.logger.info(
      `Nick \`${event.nick}' is already in use - switching to \`${newNick}'`
    );

    this.client.changeNick(newNick);
  }

  /**
   * Handles private messages
   * @param {Object} event - The private message event object
   */
  onPrivMsg(event) {
    const ignored_nicks = this.config["ignored_nicks"];

    // Skip responding to ignored nicknames.
    if (ignored_nicks.some((nick) => wildcard(nick, event.nick))) {
      return;
    }

    const result = event.message.match(this.highlightedMessage);

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
      } = this.openaiConfig;

      const currentTime = new Date();
      const context = {
        nick: event.nick,
        channel: event.target,
        message: msg,
        rawMessage: event.message,
        currentTime: currentTime,
        currentTimeUTC: currentTime.toUTCString(),
      };
      const templatedMessages = renderChatMessages(messages, context);

      this.logger.debug(
        "Requesting completion using instructions: %j",
        templatedMessages
      );

      const completion = (async () =>
        await this.llm.chat.completions.create({
          model,
          messages: templatedMessages,
          temperature,
          max_tokens,
          top_p,
          frequency_penalty,
          presence_penalty,
        }))();

      const logger = this.logger;
      const config = this.config;
      const client = this.client;

      completion
        .then(function (c) {
          logger.debug("Completion result: %o", c);
          const choices = c.choices;

          if (choices && Array.isArray(choices) && choices.length > 0) {
            let message = choices[0].message;
            let content = message.content;

            logger.debug("Generated message: %j", content);

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

              if (config.host == "irc.rwx.im") {
                // fml
                thoughtLines.forEach((line) => {
                  if (line.trim().length !== 0) {
                    client.action("#thoughts", `thinks 💭 ${line.trim()}`);
                  }
                });
              }
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
        })
        .catch((error) => {
          console.log(error);

          client.say(
            event.target,
            `${event.nick}: OpenAI error: ${error.message}`
          );
        });
    }
  }

  onQuit(event) {
    if (
      this.config.keepnick &&
      this.client.user.nick != this.config.nick &&
      event.nick == this.config.nick
    ) {
      // The user with our preferred nickname just quit, let's take it!
      this.logger.info(
        "`%s' just quit - trying to take over the nickname!",
        event.nick
      );
      this.client.changeNick(this.config.nick);
    }
  }
}
