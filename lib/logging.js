import pino from "pino";

const formatters = {
  level(label, _number) {
    return { level: label };
  },

  bindings(bindings) {
    return {
      host: { name: bindings.hostname },
      process: { pid: bindings.pid },
    };
  },
};

const STDOUT_LOGGER = pino({
  level: process.env.NODE_ENV == "development" ? "debug" : "info",
  errorKey: "error",
  messageKey: "message",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters,
});

export function createLogger(name, ...opts) {
  const logger = STDOUT_LOGGER.child({
    name: name,
    ...opts,
  });

  return logger;
}
