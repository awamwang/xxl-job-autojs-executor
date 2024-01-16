import http from "http";

import { WebSocketManager } from "./WebSocketManager";
import { DeviceManager } from "./DeviceManager";
import ScriptExecutor from './ScriptExecutor';

export default function main(httpServer: http.Server) {
  WebSocketManager.init(httpServer);
  DeviceManager.init();

  return ScriptExecutor.getInstance();
}
