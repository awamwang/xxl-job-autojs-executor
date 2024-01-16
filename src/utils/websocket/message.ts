import * as websocket from "websocket";
// import getLogger from '@/utils/log4js';
import { createXxlJobLogger } from "../logger";

// const logger = getLogger('Util');
const { logger } = createXxlJobLogger();

export function parseMessage(message: websocket.Message) {
  // logger.debug("on client message: ", message);
  if (message.type == "utf8") {
    try {
      const json = JSON.parse(message.utf8Data);

      return json;
    } catch (e) {
      logger.info(`message.utf8Data -> ${message.utf8Data}`);
      logger.error(e);
    }
  }

  return null;
}
