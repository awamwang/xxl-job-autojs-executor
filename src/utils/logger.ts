import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf } = format;

const xxlJobFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [XXL-JOB] ${level}: ${message}`;
});

export function createXxlJobLogger(localName?: string) {
  const logger = createLogger({
    format: combine(timestamp(), xxlJobFormat),
    transports: [new transports.Console()],
    // level: "debug",
  });

  const filename = `logs/${localName}-${new Date().getMonth()}-${new Date().getDate()}.log`;
  if (localName) logger.add(new transports.File({ filename }));

  return {
    logger,
  };
}
