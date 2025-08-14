import IRC from "irc-framework";
import wildcard from "wildcard";

import { createLogger } from "./logging.js";
import {
  renderChatMessages,
  markdownToText,
  removeRedundantNewlines,
} from "./message_utils.js";

export class IrcBot {
  constructor(config, llmClient, llmConfig) {
    this.client = new IRC.Client(config);
    this.config = config;
    this.highlightedMessage = null;
    this.llm = llmClient;
    this.llmConfig = llmConfig;
    this.logger = createLogger("chadgpt.IrcBot");

    this.#setupEventHandlers();
  }

  /**
   * Sets up event handlers for various IRC events
   * @private
   */
  #setupEventHandlers() {
    this.client.on("nick in use", (event) => this.onNickInUse(event));
    this.client.on("nick", (event) => this.onNickChange(event));
    this.client.on("registered", (event) => this.onRegistered(event));
    this.client.on("privmsg", (event) => {
      this.onPrivMsg(event).catch((error) => {
        this.logger.error({ error }, "error handling privmsg");
      });
    });
    this.client.on("quit", (event) => this.onQuit(event));
  }

  /**
   * Connects the IRC client to the server
   */
  connect() {
    this.logger.setBindings({
      server: { address: this.config.host, port: this.config.port },
    });
    this.logger.info("initiating connection to irc server");
    this.client.connect();
  }

  /**
   * Gracefully shuts down the IRC client connection
   */
  shutdown() {
    this.logger.info("initiating shutdown");
    this.client.quit("Shutting down..");
  }

  /**
   * Handles successful IRC registration
   * @param {Object} event - The registration event object containing nick information
   */
  onRegistered(event) {
    this.logger.info(
      { user: { name: event.nick } },
      "connected and registered",
    );
    this.highlightedMessage = new RegExp(`^${event.nick}[,:] (?<msg>.*)`);

    for (const channel of this.config.channels) {
      this.logger.debug(
        { irc: { channel: { name: channel } } },
        "joining channel",
      );
      this.client.join(channel);
    }
  }

  /**
   * Handles nickname changes
   * @param {Object} event - The nick change event object
   */
  onNickChange(event) {
    if (event.nick == this.client.user.nick) {
      // It was our nickname that changed
      this.logger.info(
        { user: { name: event.nick }, irc: { nick: event.new_nick } },
        "nickname changed",
      );
      this.highlightedMessage = new RegExp(`^${event.new_nick}[,:] (?<msg>.*)`);
    } else {
      // Someone else changed their nickname
      this.logger.info(
        { user: { name: event.nick }, irc: { nick: event.new_nick } },
        "user changed nickname",
      );

      if (
        this.config.keepnick &&
        this.client.user.nick != this.config.nick &&
        event.nick == this.config.nick
      ) {
        this.logger.info(
          { irc: { nick: this.config.nick } },
          "attempting to reclaim nickname",
        );
        this.client.changeNick(this.config.nick);
      }
    }
  }

  /**
   * Handles nickname collision events
   * @param {Object} event - The nick-in-use event object
   */
  onNickInUse(event) {
    const newNick = event.nick.concat("_");

    this.logger.info(
      { irc: { nick: event.nick } },
      "nickname is already in use",
    );
    this.client.changeNick(newNick);
  }

  /**
   * Checks if a nickname should be ignored
   * @private
   * @param {string} nick - The nickname to check
   * @returns {boolean} - True if the nickname should be ignored
   */
  #shouldIgnoreNick(nick) {
    return this.config["ignored_nicks"].some((pattern) =>
      wildcard(pattern, nick),
    );
  }

  /**
   * Creates a context object for message rendering
   * @private
   * @param {Object} event - The IRC event object
   * @param {string} message - The extracted message
   * @returns {Object} - The context object
   */
  #createMessageContext(event, message) {
    const currentTime = new Date();

    return {
      nick: event.nick,
      botNick: this.client.user.nick,
      botUsername: this.client.user.username,
      botGecos: this.client.user.gecos,
      channel: event.target,
      message: message,
      rawMessage: event.message,
      currentTime: currentTime,
      currentTimeUtc: currentTime.toUTCString(),
    };
  }

  /**
   * Requests a completion and returns the completion response
   * @private
   * @param {Array<Object>} messages - List of message_utils
   * @return {Object} - the response
   */
  #createCompletion(messages) {
    return this.llm.createTextCompletion({ messages });
  }

  /**
   * Handles private messages
   * @param {Object} event - The private message event object
   */
  async onPrivMsg(event) {
    if (this.#shouldIgnoreNick(event.nick)) return;

    const result = event.message.match(this.highlightedMessage);
    if (!result) return;

    const message = result[1];
    const context = this.#createMessageContext(event, message);
    const renderedMessages = this.#renderChatMessages(context);
    const startTime = performance.now();

    try {
      const userMask = `${event.nick}!${event.ident}@${event.hostname}`;
      this.logger.info(
        {
          irc: { message: event.message },
          gen_ai: { request: { model: this.llmConfig.model } },
          user: { id: userMask, name: event.nick },
        },
        "requesting chat completion",
      );

      const completion = await this.#createCompletion(renderedMessages);
      const delta = Math.round(performance.now() - startTime);
      this.logger.debug(
        {
          gen_ai: { response: { id: completion.id, model: completion.model } },
          request_time_ms: delta,
        },
        "generated chat completion",
      );
      const choices = completion.choices;

      if (choices && Array.isArray(choices) && choices.length > 0) {
        let message = choices[0].message;
        let content = message.content;
        let text = removeRedundantNewlines(markdownToText(content).trim());
        let thoughts = message.reasoning_content || "";
        let thoughtLines = thoughts.split("\n");

        // Send thoughts to the configured thoughts channel if specified
        if (this.llmConfig.thoughts_channel && thoughts.trim().length > 0) {
          thoughtLines.forEach((line) => {
            if (line.trim().length !== 0) {
              this.client.action(
                this.llmConfig.thoughts_channel,
                `thinks 💭 ${line.trim()}`,
              );
            }
          });
        }

        let lines = text.split("\n");
        const maxLines = 7;

        let specialCase = lines.length == maxLines + 1;
        lines.slice(0, maxLines + specialCase).forEach((line) => {
          this.client.say(event.target, `${event.nick}: ${line}`);
        });

        if (!specialCase && lines.length > maxLines) {
          const truncatedLines = lines.length - maxLines;

          this.client.say(
            event.target,
            `${event.nick}: … (${truncatedLines} lines truncated from response)`,
          );
        }
      }
    } catch (error) {
      this.client.say(event.target, `${event.nick}: Error: ${error.message}`);
    }
  }

  /**
   * Renders the configured messages through a template engine.
   * @param {Object} context - The context passed to the template engine
   */
  #renderChatMessages(context) {
    return renderChatMessages(this.llmConfig.messages, context);
  }

  onQuit(event) {
    if (
      this.config.keepnick &&
      this.client.user.nick != this.config.nick &&
      event.nick == this.config.nick
    ) {
      const userMask = `${event.nick}!${event.ident}@${event.hostname}`;

      this.logger.info(
        { user: { id: userMask, name: event.nick } },
        "attempting to recapture nickname after user quit",
      );
      this.client.changeNick(this.config.nick);
    }
  }
}
