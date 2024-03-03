import * as querystring from "querystring";
import * as http from "http";
// import getLogger from '@/utils/log4js';
import { createXxlJobLogger } from "../utils/logger";
import { WebSocketManager, WebSocketExt } from "./WebSocketManager";

const DEBUG = false;
// const logger = getLogger('DeviceManager');
const { logger } = createXxlJobLogger("DeviceManager");

export interface Device {
  name: string;
  ip?: string;
  connect_time?: Date;
}
export interface DeviceData extends Device {
  app_version_code: number;
  device_name: string;
}
const DeviceMap = new Map<string, Device>();

export class DeviceManager {
  static instance: DeviceManager;

  public static getInstance() {
    if (!DeviceManager.instance) {
      logger.info("DeviceManager Not initialized!");
    }
    return DeviceManager.instance;
  }

  private static async upsertDevice(params: { name?: string; ip?: string }) {
    const { name, ip } = params;
    const deviceName = (name || ip) as string;
    const device: Device = {
      name: deviceName,
      ip,
      connect_time: new Date(),
    };

    DeviceMap.set(deviceName, device);
    return device;
  }

  private static async clientHelloListener(
    client: WebSocketExt,
    data: DeviceData
  ) {
    // logger.debug("on client hello: ", data);
    client.name = data["device_name"];
    let appVersionCode = data["app_version_code"];
    client.extData = await this.upsertDevice({
      name: client.name,
      ip: client.ip,
    });

    let returnData;
    if (appVersionCode >= 629) {
      returnData = {
        data: "ok",
        version: "1.109.0",
        debug: DEBUG,
        type: "hello",
      };
    } else {
      returnData = { data: "连接成功", debug: DEBUG, type: "hello" };
    }

    logger.debug(`hello return data: ${JSON.stringify(returnData)}`);
    logger.info(`hello client: ${JSON.stringify(client.extData)}`);
    WebSocketManager.getInstance().sendUtf(client, returnData);
  }

  private static clientPingListener(client: WebSocketExt, data: any) {
    var returnData = { type: "pong", data: data };
    logger.debug(`on client ping: ${JSON.stringify(data)}`);
    logger.debug(`pong: ${JSON.stringify(returnData)}`);
    WebSocketManager.getInstance().sendUtf(client, returnData);
  }

  public static init() {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }

    WebSocketManager.getInstance().addClientRequestListeners(async (req) => {
      const params =
        (req.url && querystring.parse(req.url.replace("/?", ""))) || {};
      if (params.token) {
        return { type: null };
      }

      return { type: "device" };
    });

    // WebSocketManager.getInstance().addClientStatusChangeListener((client, status) => {
    //   if (status === 'open' && client.type === 'device') {
    //     WebSocketManager.getInstance().sendUtf(client, { type: 'hello', data: { server_version: 2 } });
    //   }
    // });

    WebSocketManager.getInstance().addClientMessageListener(
      async (client, message) => {
        // logger.debug('WebSocket.Client onClientMessage -> ' + client.type + ' message -> ' + JSON.stringify(message || 'NULL'));
        if (client.type === "device") {
          // const message = JSON.parse(data as string);
          if (message.type === "hello") {
            await this.clientHelloListener(client, message.data);
          } else if (message.type === "ping") {
            this.clientPingListener(client, message.data);
          } else if (message.type === "status") {
            client.emitter?.emit("script:status", message.data);
          }
        }
      }
    );
  }

  public getOnlineDevices(noError: boolean = false) {
    const onlineClients = WebSocketManager.getInstance()
      .getClients("device")
      .filter((c) => c.extData);

    if (!noError && onlineClients.length === 0) {
      throw new Error("没有在线设备");
    }

    return onlineClients;
    // const deviceClients: Device[] = [];
    // WebSocketManager.getInstance()
    //   .getClients()
    //   .forEach((c) => {
    //     if (c.type === "device" && c.extData) {
    //       deviceClients.push({
    //         ip: c.ip,
    //         name: c.extData.name,
    //       });
    //     }
    //   });
    // if (!noError && deviceClients.length === 0) {
    //   throw new Error("没有在线设备");
    // }

    // return deviceClients;
  }

  public filterOnlineDevices(names: string) {
    return this.getOnlineDevices(true).filter(
      (d) => !names || names.includes(d.name)
    );
  }

  public getOnlineDeviceById(id: string, noError: boolean = false) {
    const deviceClients = this.getOnlineDevices();

    const device = deviceClients.find((c) => c.ip === id || c.name === id);

    if (!noError && !device) {
      throw new Error(`没有找到id为${id}的设备`);
    }

    return device;
  }

  public sendMessageById(id: string, message: any) {
    const client = this.getOnlineDeviceById(id, true);
    if (client) {
      WebSocketManager.getInstance().sendMessage(client, message);
    }

    // WebSocketManager.getInstance()
    //   .getClients("device")
    //   .forEach((client) => {
    //     if (client.extData.name === id || client.extData.ip === id) {
    //       WebSocketManager.getInstance().sendMessage(client, message);
    //     }
    //   });
  }

  public disconnectDeviceByIp(ip: string) {
    WebSocketManager.getInstance()
      .getClients()
      .forEach((c) => {
        if (c.type === "device" && c.ip === ip) {
          c.drop();
        }
      });
  }

  public disconnectDeviceByName(name: string) {
    WebSocketManager.getInstance()
      .getClients()
      .forEach((c) => {
        if (c.type === "device" && c.extData.name === name) {
          c.drop();
        }
      });
  }
}
