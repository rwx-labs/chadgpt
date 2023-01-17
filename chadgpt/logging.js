import winston, { format, transports } from "winston";

const logFormat = format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;

    return msg;
  }
);

function createLogger(name) {
  const logger = winston.createLogger({
    level: "debug",
    format: format.combine(
      format.colorize(),
      format.splat(),
      format.timestamp(),
      logFormat
    ),
    transports: [new transports.Console({ timestamp: true })],
  });

  return logger;
}

export default { createLogger };
