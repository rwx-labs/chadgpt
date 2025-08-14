import { AnthropicClient } from "./llm/anthropic.ts";
import { LlmConfig } from "./config.js";
import { OpenAIClient } from "./llm/openai.ts";

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

/**
 * The reasoning method.
 */
export enum ReasoningMethod {
  ExtractThinkTagsFromMessage = "think-answer-tags",
  ExtractThoughtContent = "thinking-message",
}

export interface TextGenerationMessage {
  /** The message contents. */
  content: string;
  /** The role of the participant. */
  role: Role;
  /** An optional name of the participant. */
  name?: string;
}

export interface TextGenerationRequest {
  /**
   * Optional naming identifier of the model.
   * Takes presedence over the LLM clients model.
   */
  model?: string;
  /** List of messages comprising the conversation. */
  messages: Array<TextGenerationMessage>;
  /** Sampling temperature to use. */
  temperature?: number;
  /** Reasoning efforts for models that support it. */
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
  /** Seed value for deterministic output generation. */
  seed?: number;
}

export interface TextGenerationResponseUsage {
  /** Number of tokens used for completion. */
  completion_tokens: number;
  /** Number of otkens used in the prompt. */
  prompt_tokens: number;
  /** Total number of tokens used (prompt + completion) */
  total_tokens: number;
}

export interface TextGenerationResponseChoice {
  /** The index of this choice. */
  index?: number;
  /** The generated message. */
  message: TextGenerationResponseMessage;
  /** The reason the model stopped generating text, usually `stop`. */
  finish_reason?: string;
}

export interface TextGenerationResponseMessage {
  /** The contents of the message. */
  content: string | null;
  /** Optional reasoning content. */
  reasoning_content?: string;
  /** Reason for refusal, if any. */
  refusal?: string;
  /** The users role, usually `assistant`. */
  role?: string;
}

export interface TextGenerationResponseThought {
  /** The contents of the thought. */
  content: string;
}

export interface TextGenerationResponse {
  /** A unique identifier of the completion. */
  id: string;
  /** The name of the model that generated this response. */
  model: string;
  /** The unix epoch timestamp of when the response was created. */
  created?: number;
  /** A unique fingerpring representing the request as it propagates through the
   * backend. */
  system_fingerprint?: string;
  /** List of thoughts the model might have had during generation. */
  thoughts?: Array<TextGenerationResponseThought>;
  /** List of choices for completions. Should always have at most 1. */
  choices: Array<TextGenerationResponseChoice>;
}

export interface LlmClient {
  createTextCompletion(
    request: TextGenerationRequest,
  ): Promise<TextGenerationResponse>;
}

export function createLlmClient(config: LlmConfig): LlmClient {
  const provider = config.provider;

  switch (provider) {
    case "anthropic":
      return new AnthropicClient(config);
    case "openai":
      return new OpenAIClient(config);
    default:
      throw new Error(`Invalid provider: ${provider}`);
  }
}
