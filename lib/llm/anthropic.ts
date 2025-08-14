import pino from "pino";
import { Anthropic } from "@anthropic-ai/sdk";

import {
  LlmClient,
  TextGenerationResponse,
  TextGenerationRequest,
  Role,
  TextGenerationResponseMessage,
  ReasoningMethod,
} from "../llm.ts";
import { LlmConfig } from "../config.js";
import { createLogger } from "../logging.js";

export class AnthropicClient implements LlmClient {
  private config: LlmConfig;
  client: Anthropic;
  logger: pino.Logger;

  constructor(config: LlmConfig) {
    this.config = config;
    this.client = new Anthropic();
    this.logger = createLogger("chadgpt.AnthropicClient");
  }

  async createTextCompletion(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    // Extract the system prompt message as Anthropic uses a parameter instead
    const systemPrompt = request.messages.find(
      (request) => request.role == Role.System
    )?.content;
    const messages = request.messages.filter(
      (request) => request.role != Role.System
    );

    let options: any = {
      model: this.config.model,
      messages: messages,
      system: systemPrompt,
      max_tokens: this.config.max_completion_tokens,
    };

    if (this.isReasoningModel()) {
      options.thinking = {
        type: "enabled",
        budget_tokens: this.config.reasoning_tokens,
      };
    }

    this.logger.debug(
      { completion_request: options },
      "creating anthropic chat completion"
    );

    const completion = await this.client.messages
      .create(options)
      .then((result) => {
        this.logger.debug(
          { completion_response: result },
          "created anthropic chat completion"
        );

        const textContent = result.content.find(
          (content) => content.type == "text"
        );

        if (!textContent) {
          throw new Error("Response did not have text content as expected");
        }

        return {
          id: result.id,
          model: result.model,
          choices: [
            {
              message: {
                role: Role.Assistant,
                content: textContent.text,
              } as TextGenerationResponseMessage,
            },
          ],
        };
      });

    return completion;
  }

  /** Returns true if the model is expected to be a reasoning model. */
  private isReasoningModel() {
    const reasoning_method = this.config.reasoning_method;

    if (
      reasoning_method == ReasoningMethod.ExtractThinkTagsFromMessage ||
      reasoning_method == ReasoningMethod.ExtractThoughtContent
    ) {
      return true;
    }

    return false;
  }
}
