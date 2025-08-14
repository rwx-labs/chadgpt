export async function openAIMockServer(model: string) {
  return Bun.serve({
    port: 0,
    async fetch(req) {
      if (req.method != "POST") {
        return new Response("Page not found", { status: 404 });
      }

      const path = new URL(req.url).pathname;

      if (path == "/v1/chat/completions") {
        const response = {
          id: "chatcmpl-" + crypto.randomUUID(),
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content:
                  "<think>hello world</think><answer>This is a mock response from the test server.</answer>",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        };

        return new Response(JSON.stringify(response), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });
}
