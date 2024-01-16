// import getLogger from '@/utils/log4js';
import { createXxlJobLogger } from "../utils/logger";
import { WebSocketManager } from "./WebSocketManager";
import { DeviceManager } from "./DeviceManager";

// const logger = getLogger('ScriptExecutor');
const { logger } = createXxlJobLogger("ScriptExecutor");

export default class ScriptExecutor {
  private static instance: ScriptExecutor;
  static getInstance() {
    if (!ScriptExecutor.instance) {
      ScriptExecutor.instance = new ScriptExecutor();
    }
    return ScriptExecutor.instance;
  }

  public run(devices: string, fileName: string, script: string) {
    const ol = DeviceManager.getInstance().filterOnlineDevices(devices);

    const data = {
      type: "command",
      data: {
        command: "run",
        id: fileName,
        view_id: fileName,
        name: fileName,
        script: script,
      },
    };

    logger.debug(`ScriptExecutor run -> ${fileName} -> ${devices}`);
    ol.forEach((client) => {
      DeviceManager.getInstance().sendMessageById(client.name, data);
    });
  }

  public runFile(devices: string, fileName: string) {
    const ols = DeviceManager.getInstance().filterOnlineDevices(devices);

    const data = {
      type: "command",
      data: {
        command: "runFile",
        name: fileName,
      },
    };
    logger.debug(`ScriptExecutor runFile -> ${fileName} devices -> ${devices}`);
    ols.forEach((client) => {
      DeviceManager.getInstance().sendMessageById(client.name, data);
    });

    return ols;
  }

  public status(deviceId: string) {
    const device = DeviceManager.getInstance().getOnlineDeviceById(deviceId);
  }

  public stop(deviceId: string, fileName: string) {
    const device = DeviceManager.getInstance().getOnlineDeviceById(deviceId);
    if (!device) return;

    const data = {
      type: "command",
      data: {
        command: "stop",
        name: fileName,
      },
    };
    DeviceManager.getInstance().sendMessageById(deviceId, data);
  }

  public stopAll(devices: string) {
    const ol = DeviceManager.getInstance().filterOnlineDevices(devices);

    const data = {
      type: "command",
      data: {
        command: "stopAll",
      },
    };

    ol.forEach((client) => {
      DeviceManager.getInstance().sendMessageById(client.name, data);
    });
  }
}
