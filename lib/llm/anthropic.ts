import { Anthropic } from "@anthropic-ai/sdk";

import {
  LlmClient,
  TextGenerationResponse,
  TextGenerationRequest,
  Role,
  TextGenerationResponseMessage,
} from "../llm.ts";
import { LlmConfig } from "../config.js";

export class AnthropicClient implements LlmClient {
  private config: LlmConfig;
  client: Anthropic;

  constructor(config: LlmConfig) {
    this.config = config;
    this.client = new Anthropic();
  }

  async createTextCompletion(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    // Format the request messages as the anthropic client expects it.
    const messages = request.messages.map((request) => {
      return {
        role: this.roleToString(request.role),
        content: request.content,
      };
    });
    const completion = await this.client.messages
      .create({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.max_completion_tokens,
      })
      .then((result) => {
        const textContent = result.content.find(
          (content) => content.type == "text"
        );

        if (!textContent) {
          throw new Error("Response did not have text content as expected");
        }

        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: textContent.text,
              } as TextGenerationResponseMessage,
            },
          ],
        };
      });

    return completion;
  }

  private roleToString(role: Role): "user" | "assistant" {
    switch (role) {
      case Role.User:
        return "user";
      case Role.Assistant:
        return "assistant";
      default:
        throw new Error(`Invalid role: ${role}`);
    }
  }
}
