import { OpenAI } from "openai";
import winston from "winston";

import { extractContentBetweenTags } from "../message_utils.js";
import {
  LlmClient,
  TextGenerationResponse,
  TextGenerationRequest,
  TextGenerationResponseMessage,
} from "../llm.ts";
import { createLogger } from "../logging.js";
import { LlmConfig } from "../config.js";

export class OpenAIClient implements LlmClient {
  private config: LlmConfig;
  client: OpenAI;
  logger: winston.Logger;

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

    if (reasoning_method == "think-answer-tags") {
      return true;
    } else if (reasoning_method == "none" || !reasoning_method) {
      return false;
    }

    return false;
  }

  async createTextCompletion(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    const completion = await this.client.chat.completions
      .create({
        model: this.config.model,
        messages: request.messages,
      })
      .then((result) => {
        const choice = result.choices[0];
        const message = choice.message;

        if (message.role != "assistant") {
          this.logger.warn(
            "openai returned a message that wasn't from the assistant as expected"
          );
        }

        if (message.content !== null && message.content.length <= 1) {
          throw new Error("Expected content");
        }

        let content = message.content as string;

        let msg: TextGenerationResponseMessage = {
          role: message.role,
          content,
        };

        if (this.isReasoningModel()) {
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
