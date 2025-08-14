# chadgpt

[![codecov](https://codecov.io/gh/rwx-labs/chadgpt/branch/main/graph/badge.svg?token=KOF6J4K4AW)](https://codecov.io/gh/rwx-labs/chadgpt)
[![Continuous Integration](https://github.com/rwx-labs/chadgpt/actions/workflows/continuous-integration.yaml/badge.svg)](https://github.com/rwx-labs/chadgpt/actions/workflows/continuous-integration.yaml)

ChadGPT is a simple IRC bot that replies to messages using large language models.

## Features

* Reasoning model support
* Keepnick (change to preferred nickname when it becomes available)

## Planned features

This is a list of futures that are planned, but have no deadline:

* Support for reasoning *and* non-reasoning models
* Message chat history
* Telemetry
* Response caching

## Usage

To use the container image with Docker, run:

```bash
docker run \
  -e OPENAI_API_KEY=<your openapi key> \
  -v ./config.yaml:/usr/src/app/config.yaml \
  ghcr.io/rwx-labs/chadgpt:edge
```

## Development

First, make sure you have Node (v22+) installed. If you use [`mise`][mise],
simply install it by running:

```
mise install
```

Then proceed to install the project dependencies:

```
pnpm install
```

Finally, you can start the client (make sure you edit `config.yaml`):

```
pnpm start
```

[mise]: https://mise.jdx.dev/getting-started.html

## License

This is licensed under the Apache 2.0 license.
