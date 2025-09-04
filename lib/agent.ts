import pino from "pino";
import { AgentConfig } from "./config.js";
import { createLogger } from "./logging.js";
import OpenAI from "openai";
import { renderChatMessages } from "./message_utils.js";
import { Role } from "./llm.ts";
import { ChatCompletionMessageParam } from "openai/resources";

/**
 * Actions for an agent to take.
 */
export enum Action {
  /**
   * Send a message to the whole channel.
   */
  Say = "say",
  /**
   * Send a message while replying to a user.
   */
  Reply = "reply",
  /**
   * Kick a user for a given reason.
   */
  Kick = "kick",
  /**
   * Do nothing for now.
   */
  Idle = "idle",
}

export default class Agent {
  private config: AgentConfig;
  private intervalId: NodeJS.Timeout;
  private logger: pino.Logger;
  private client: OpenAI;

  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = createLogger("chadgpt.Agent");
    this.logger.debug({ tick: config.tick }, "registering periodic callback");
    this.intervalId = setInterval(() => this.tick(), config.tick * 1000);
    this.client = new OpenAI({
      baseURL: "https://open-webui.rwx.im/api/v1",
      // baseURL: "http://localhost:11434/v1",
      // apiKey: "d"
    });
    this.tick();
  }

  private async tick() {
    this.logger.debug("engaging agent task");

    const messages: Array<ChatCompletionMessageParam> = [
      {
        role: Role.System,
        content: this.config.prompt,
      },
      {
        role: Role.User,
        content: this.config.userPrompt,
      },
    ];
    const renderedMessages: Array<ChatCompletionMessageParam> =
      renderChatMessages(messages, {}) as Array<ChatCompletionMessageParam>;
    const tools = [
      {
        type: "function",
        function: {
          name: "say",
          description: "Send a message to everyone in the channel",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The message to send",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "reply",
          description: "Send a message directed to a specific user",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The directed user message to send",
              },
              user: {
                type: "string",
                description:
                  "The nickname of the user the message is directed at",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "kick",
          description: "Kicks a user from the IRC channel for a given reason",
          parameters: {
            type: "object",
            properties: {
              user: {
                type: "string",
                description: "The nickname of the user to kick",
              },
              reason: {
                type: "string",
                description: "The reason the user is being kicked",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "idle",
          description: "Do nothing for now",
        },
      },
    ];

    this.logger.debug({ messages }, "sending message completion request");
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: renderedMessages,
      tool_choice: "auto",
      tools: tools as any,
      reasoning_effort: "high",
    });

    this.logger.debug({ response }, "issued completion");
    this.logger.debug("completed agent task");
  }

  stop(): void {
    this.logger.debug("clearing periodic callback");
    clearInterval(this.intervalId);
  }
}
