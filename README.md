# chadgpt

ChadGPT is a simple IRC bot that replies to messages using OpenAI's GPT models.

# Usage

To use the container image with Docker, run:

```bash
docker run -e OPENAI_API_KEY=<key> -v $(pwd)/config.yaml:/usr/src/app/config.yaml ghcr.io/rwx-labs/chadgpt:edge
```

# License

This is licensed under the Apache 2.0 license.
