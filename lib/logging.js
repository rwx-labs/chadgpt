import * as winston from "winston";
import { format, transports } from "winston";

const logFormat = format.printf(
  ({ level, message, timestamp, label, ..._metadata }) => {
    let msg = `${timestamp} ${level.padStart(5, " ")} ${label}: ${message} `;

    return msg;
  }
);

export function createLogger(name) {
  const logger = winston.createLogger({
    level: "debug",
    format: format.combine(
      format.colorize(),
      format.splat(),
      format.timestamp(),
      format.label({ label: name }),
      logFormat
    ),
    transports: [
      new transports.Console({ name: name, timestamp: true, label: true }),
    ],
  });

  return logger;
}
