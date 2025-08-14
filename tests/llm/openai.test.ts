import { describe, test, expect, beforeEach, afterEach } from "bun:test";

import { OpenAIClient } from "../../lib/llm/openai.ts";
import { openAIMockServer } from "../setup.ts";
import { LlmConfig } from "../../lib/config.js";
import { TextGenerationRequest } from "../../lib/llm.ts";

let OPENAI_SERVER: any;

beforeEach(async () => {
  OPENAI_SERVER = await openAIMockServer("test-model");
});

afterEach(async () => {
  await OPENAI_SERVER.stop(true);
});

describe("OpenAIClient", () => {
  test("should extract reasoning thoughts and answers", async () => {
    const config = LlmConfig.from({
      model: "test-model",
      base_url: `${OPENAI_SERVER.url}v1`,
      messages: [],
      reasoning_method: "think-answer-tags",
    });
    const llm = new OpenAIClient(config);
    const result = await llm.createTextCompletion({
      model: "test-model",
      messages: [],
    } as TextGenerationRequest);

    expect(result.choices[0].message.content).toEqual(
      "This is a mock response from the test server.",
    );
    expect(result.choices[0].message.reasoning_content).toEqual("hello world");
  });
});
