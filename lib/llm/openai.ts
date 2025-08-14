import { OpenAI } from "openai";
import pino from "pino";

import { extractContentBetweenTags } from "../message_utils.js";
import {
  LlmClient,
  TextGenerationResponse,
  TextGenerationRequest,
  TextGenerationResponseMessage,
  ReasoningMethod,
  Role,
} from "../llm.ts";
import { createLogger } from "../logging.js";
import { LlmConfig } from "../config.js";

export class OpenAIClient implements LlmClient {
  private config: LlmConfig;
  client: OpenAI;
  logger: pino.Logger;

  constructor(config: LlmConfig) {
    this.config = config;

    let opts: { [key: string]: any } = {};

    if (config.base_url) {
      opts["baseURL"] = config.base_url;
    }

    this.client = new OpenAI(opts);
    this.logger = createLogger("chadgpt.OpenAIClient");
  }

  /** Returns true if the model is expected to be a reasoning model. */
  private isReasoningModel() {
    const reasoning_method = this.config.reasoning_method;

    if (reasoning_method == ReasoningMethod.ExtractThinkTagsFromMessage) {
      return true;
    }

    return false;
  }

  async createTextCompletion(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    const options: any = {
      model: this.config.model,
      messages: request.messages,
    };

    const seed = request.seed ?? this.config.seed;
    if (seed) {
      options.seed = seed;
    }

    const reasoning_effort =
      request.reasoning_effort ?? this.config.reasoning_effort;
    if (reasoning_effort) {
      options.reasoning_effort = reasoning_effort;
    }

    this.logger.debug(
      { completion_request: options },
      "creating openai chat completion"
    );

    const completion = await this.client.chat.completions
      .create(options)
      .then((result) => {
        this.logger.debug(
          { completion_response: result },
          "created openai chat completion"
        );

        const choice = result.choices[0];
        const message = choice.message;

        if (message.role != Role.Assistant) {
          this.logger.warn(
            "openai returned a message that wasn't from the assistant as expected"
          );
        }

        if (message.content !== null && message.content.length <= 1) {
          throw new Error("OpenAI returned empty content");
        }

        let content = message.content as string;

        let msg: TextGenerationResponseMessage = {
          role: message.role,
          content,
        };

        if (
          this.isReasoningModel() &&
          this.config.reasoning_method ==
            ReasoningMethod.ExtractThinkTagsFromMessage
        ) {
          let [thoughts, answers] = this.extractThoughtsAndAnswers(content);

          msg.reasoning_content = thoughts;
          msg.content = answers;
        }

        return {
          id: result.id,
          model: result.model,
          created: result.created,
          system_fingerprint: result.system_fingerprint,
          choices: [
            {
              index: choice.index,
              message: msg,
            },
          ],
        };
      });

    return completion;
  }

  private extractThoughtsAndAnswers(content: string): [string, string | null] {
    const thoughts = extractContentBetweenTags(content, "think");
    const answers = extractContentBetweenTags(content, "answer");
    const completeAnswer = answers?.join("\n");
    const completeThoughts = thoughts?.join("\n");

    return [completeThoughts, completeAnswer];
  }
}
