import express from "express";
import config from "config";
import type { JobHandler, IExecutorOptions } from "xxl-job";
import { createXxlJobExecutor } from "xxl-job";

import { createXxlJobLogger } from "./utils/logger";
import startAutojs from "./autojs";
import ScriptExecutor from "./autojs/ScriptExecutor";

const { logger } = createXxlJobLogger("app");

const port = 9991
const executorConfig: Partial<IExecutorOptions<any>> = config.has("executor")
  ? config.get("executor")
  : {};

const app = express();
app.use(express.json());

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  logger.info(`Server started on port ${port}`);

  const xxlJobExecutor = createXxlJobExecutor({
    app,
    jobHandlers,
    appType: "express",
    executorKey: "xxl-job-default",
    accessToken: "123",
    baseUrl: "http://172.1.1.1:9999",
    scheduleCenterUrl: "http://172.1.1.2:18080/xxl-job-admin",
    logStorage: "local",
    ...executorConfig,
  });
  xxlJobExecutor.initialization();
});
let autojsServer: ScriptExecutor = startAutojs(server);

const jobHandlers = new Map<string, JobHandler>();
// jobHandlers.set("autojs_batch", async (jobLogger, jobRequest, jobParams) => {
//   jobLogger.warn(
//     `request: ${JSON.stringify(jobRequest)}, params: ${jobParams}`
//   );
//   if (!jobParams) {
//     logger.warn("jobParams is null, not run autojs");
//     return;
//   }

//   // 用分号分割，获得名字和 device列表，然后用逗号分割 device 列表——例如“朴朴超市;Mate30,Pad”
//   const [fileName, devices] = jobParams.split(";");
//   // const devices = deviceNames.split(",");
//   const script = jobParams.script;
//   logger.info(JSON.stringify({ devices, fileName, script }));

//   // autojsServer.run(devices, fileName, script);
//   autojsServer.runFile(devices, fileName);

//   // 拿到所有设备的 websocket
//   // 等待所有 web socketon 执行结束
//   await
// });
jobHandlers.set("autojs", async (jobLogger, jobRequest, jobParams) => {
  jobLogger.warn(
    `request: ${JSON.stringify(jobRequest)}, params: ${jobParams}`
  );
  if (!jobParams) {
    logger.warn("jobParams is null, not run autojs");
    return;
  }

  const [fileName, device] = jobParams.split(";");
  // const devices = deviceNames.split(",");
  const script = jobParams.script;
  logger.info(JSON.stringify({ device, fileName, script }));

  // autojsServer.run(devices, fileName, script);
  const clients = autojsServer.runFile(device, fileName);
  const client = clients[0];
  if (!client) {
    jobLogger.error("no online client, not run autojs");
    return;
  }

  // 拿到所有设备的 websocket
  // 等待所有 web socketon 执行结束
  await new Promise((resolve) => {
    function scriptLogListener(message: any) {
      jobLogger.info(message.data.log);
    }
    function scriptScriptListener(data: any) {
      logger.info(`message type` + JSON.stringify(data));
      if (data.status === "destroy") {
        clearListener();
        resolve(data);
      }
    }
    function clearListener() {
      client.off("script:log", scriptLogListener);
      client.off("script:status", scriptScriptListener);
    }

    // @ts-ignore script:log是代码中 emit 出来的
    client.on("script:log", scriptLogListener);
    // @ts-ignore script:status是代码中 emit 出来的
    client.on("script:status", scriptScriptListener);
    client.on("close", clearListener);
    client.on("error", clearListener);

    // setTimeout(() => {
    //   jobLogger.error("autojs执行超时");
    //   clearListener();
    //   resolve({ status: "timeout" });
    // }, 10000);
  });
});
