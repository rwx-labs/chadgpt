# chadgpt

[![codecov](https://codecov.io/gh/rwx-labs/chadgpt/branch/main/graph/badge.svg?token=KOF6J4K4AW)](https://codecov.io/gh/rwx-labs/chadgpt)
[![Continuous Integration](https://github.com/rwx-labs/chadgpt/actions/workflows/continuous-integration.yaml/badge.svg)](https://github.com/rwx-labs/chadgpt/actions/workflows/continuous-integration.yaml)

ChadGPT is a simple IRC bot that replies to messages using OpenAI's GPT models.

## Usage

To use the container image with Docker, run:

```bash
docker run \
  -e OPENAI_API_KEY=<your openapi key> \
  -v ./config.yaml:/usr/src/app/config.yaml \
  ghcr.io/rwx-labs/chadgpt:edge
```

## Development

First, make sure you use the expected Node.js version.

- If you use nvm, run `nvm use`
- If you use fnm, run `fnm use`

Next, install `pnpm` if you haven't already:

```
npm install -g pnpm
```

Then install the project dependencies:

```
pnpm install
```

Finally, you can start the client (make sure you edit `config.yaml`):

```
pnpm start
```

## License

This is licensed under the Apache 2.0 license.
