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
    const systemPrompt = request.messages.find(
      (request) => request.role == "system"
    )?.content;
    // Format the request messages as the anthropic client expects it.
    const messages = request.messages
      .filter((request) => request.role != "system")
      .map((request) => {
        return {
          role: this.roleToString(request.role),
          content: request.content,
        };
      });

    let options = {
      model: this.config.model,
      messages: messages,
      system: systemPrompt,
      max_tokens: this.config.max_completion_tokens,
    };

    const completion = await this.client.messages
      .create(options)
      .then((result) => {
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
