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
    request: TextGenerationRequest,
  ): Promise<TextGenerationResponse> {
    // Extract the system prompt message as Anthropic uses a parameter instead
    const systemPrompt = request.messages.find(
      (request) => request.role == Role.System,
    )?.content;
    const messages = request.messages.filter(
      (request) => request.role != Role.System,
    );

    let options: any = {
      model: this.config.model,
      messages: messages,
      system: systemPrompt,
      max_tokens: this.config.max_completion_tokens,
    };

    if (this.isReasoningModel()) {
      if (this.config.reasoning_method == ReasoningMethod.Adaptive) {
        options.thinking = {
          type: "adaptive",
          display: "omitted", // FIXME: we may want to use summarized in the future
        };

        const effort = this.config.reasoning_effort;

        if (this.config.reasoning_effort) {
          options.output_config = {
            effort,
          };
        }
      } else {
        options.thinking = {
          type: "enabled",
          budget_tokens: this.config.reasoning_tokens,
        };
      }
    }

    this.logger.debug(
      { completion_request: options },
      "creating anthropic chat completion",
    );

    const completion = await this.client.messages
      .create(options)
      .then((result) => {
        this.logger.debug(
          { completion_response: result },
          "created anthropic chat completion",
        );

        const stop_reason = result.stop_reason;

        if (stop_reason == "refusal") {
          const refusal_category = result.stop_details?.category;
          const refusal_message = refusal_category
            ? this.refusalCategoryReason(refusal_category)
            : "no refusal category given, so dunno why";

          throw new Error(
            `The request was refused by the provider: ${refusal_message}`,
          );
        }

        const textContent = result.content.find(
          (content) => content.type == "text",
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

  /** Returns a human readable reason explaining the given refusal category. */
  private refusalCategoryReason(category: string): string {
    switch (category) {
      case "cyber":
        return "The request could enable cyber harm, such as malware or exploit development. Benign cybersecurity work can also trigger this refusal.";
      case "bio":
        return "The request could enable biological harm, such as dangerous lab methods. Beneficial life sciences work can also trigger this refusal.";
      case "frontier_llm":
        return "The request could assist the development of competing AI models, which is restricted under Anthropic's commercial terms. Benign machine learning work can also trigger this refusal.";
      case "reasoning_extraction":
        return "The request asks the model to reproduce its internal reasoning in the response text.";
      default:
        return `Refusal category: ${category}`;
    }
  }

  /** Returns true if the model is expected to be a reasoning model. */
  private isReasoningModel() {
    const reasoning_method = this.config.reasoning_method;

    return (
      reasoning_method == ReasoningMethod.ExtractThinkTagsFromMessage ||
      reasoning_method == ReasoningMethod.ExtractThoughtContent ||
      reasoning_method == ReasoningMethod.Adaptive
    );
  }
}
