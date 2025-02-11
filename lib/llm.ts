import { OpenAI as OpenAIClient } from "openai";

import { LlmConfig } from "./config.js";

/**
 * Base configuration for any LLM client.
 * Specific providers may extend this interface.
 */
export interface AdapterConfig {
  apiKey: string;
  [key: string]: any; // Allows for provider-specific configuration
}

/**
 * The LLM API provider.
 */
export type Provider = "openai" | "anthropic";

/**
 * The role of the participant in a conversation.
 */
export enum Role {
  System = "system",
  User = "user",
  Assistant = "assistant",
}

export interface TextGenerationMessage {
  /**
   * The message contents.
   */
  content: string;

  /**
   * The role of the participant.
   */
  role: Role;

  /**
   * An optional name of the participant.
   */
  name?: string;
}

export interface TextGenerationRequest {
  /**
   * Naming identifier of the model.
   */
  model: string;

  /**
   * List of messages comprising the conversation.
   */
  messages: Array<TextGenerationMessage>;

  /**
   * Sampling temperature to use.
   */
  temperature: number;
}

export interface TextGenerationResponse {}

interface LlmClient {
  createTextCompletion(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse>;
}

export class OpenAIAdapter implements LlmClient {
  config: LlmConfig;
  client: OpenAIClient;

  constructor(config: LlmConfig, client: OpenAIClient) {
    this.config = config;
    this.client = client;
  }

  createTextCompletion(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    return this.client.chat.completions.create({
      model: this.config.model,
      messages: request.messages,
    });
  }
}

export function createLlmAdapter(config: LlmConfig): LlmClient {
  let opts = {};

  if (config.base_url != null) {
    opts["baseURL"] = config.base_url;
  }

  const client = new OpenAIClient(opts);
  return new OpenAIAdapter(config, client);
}
