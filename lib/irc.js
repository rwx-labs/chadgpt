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
    this.client = new IRC.Client(config);
    this.config = config;
    this.highlightedMessage = null;
    this.logger = createLogger("chadgpt");
    this.llm = llmClient;
    this.openaiConfig = openaiConfig;

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
    this.client.on("privmsg", (event) => {
      this.onPrivMsg(event).catch((error) => {
        this.logger.error("Error handling privmsg:", error);
      });
    });
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
   * Checks if a nickname should be ignored
   * @private
   * @param {string} nick - The nickname to check
   * @returns {boolean} - True if the nickname should be ignored
   */
  #shouldIgnoreNick(nick) {
    return this.config["ignored_nicks"].some((pattern) =>
      wildcard(pattern, nick)
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
  async #createCompletion(messages) {
    const {
      model,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
    } = this.openaiConfig;

    return await this.llm.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
    });
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
    const { messages } = this.openaiConfig;
    const templatedMessages = renderChatMessages(messages, context);

    this.logger.debug(
      "Requesting completion using instructions: %j",
      templatedMessages
    );

    try {
      const completion = await this.#createCompletion(templatedMessages);

      this.logger.debug("Completion result: %o", completion);
      const choices = completion.choices;

      if (choices && Array.isArray(choices) && choices.length > 0) {
        let message = choices[0].message;
        let content = message.content;

        this.logger.debug("Generated message: %j", content);

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

          if (this.config.host == "irc.rwx.im") {
            // fml
            thoughtLines.forEach((line) => {
              if (line.trim().length !== 0) {
                this.client.action("#thoughts", `thinks 💭 ${line.trim()}`);
              }
            });
          }
        }

        let lines = text.split("\n");
        const maxLines = 7;

        let specialCase = lines.length == maxLines + 1;
        lines.slice(0, maxLines + specialCase).forEach((line) => {
          this.client.say(event.target, `${event.nick}: ${line}`);
        });

        if (!specialCase && lines.length > maxLines) {
          this.client.say(
            event.target,
            `${event.nick}: .. (${
              lines.length - maxLines
            } lines truncated from response)`
          );
        }
      }
    } catch (error) {
      this.client.say(
        event.target,
        `${event.nick}: OpenAI error: ${error.message}`
      );
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
