import express from "express";
import config from "config";
import type { JobHandler, IExecutorOptions } from "xxl-job-nodejs";
import { createXxlJobExecutor } from "xxl-job-nodejs";

import { createXxlJobLogger } from "./utils/logger";
import startAutojs from "./autojs";
import ScriptExecutor from "./autojs/ScriptExecutor";

const { logger } = createXxlJobLogger("app");

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

  const [fileName, device = "", args = ""] = jobParams.split(";");
  // const devices = deviceNames.split(",");
  const script = jobParams.script;
  const noLog = !!args.includes("noLog");
  logger.info(JSON.stringify({ device, fileName, script, noLog }));

  // autojsServer.run(devices, fileName, script);
  const clients = autojsServer.runFile(device, fileName);
  const client = clients[0];
  if (!client) {
    throw new Error("no online client, not run autojs");
  }

  // 拿到所有设备的 websocket
  // 等待所有 web socket on 执行结束
  await new Promise((resolve, reject) => {
    if (!client.emitter) jobLogger.error("client.emitter is null");

    function scriptLogListener(message: any) {
      if (noLog) return

      const log = message.data.log
      // LIO-AN00-ScriptClient-11:30:58+405 [DEBUG] : clickUiObjectGone: 没有找到"textContains("看小视频再领").boundsInside(0, 0, 1176, 2400)"
      const logLevel = log.match(/\[(.*)\]/)?.[1];
      // console.log(logLevel, log)
      if (logLevel === "DEBUG") {
        jobLogger.debug(log);
      } else if (logLevel === "INFO") {
        jobLogger.info(log);
      } else if (logLevel === "WARN") {
        jobLogger.warn(log);
      } else if (logLevel === "ERROR") {
        jobLogger.error(log);
        reject(new Error(log));
      }
    }
    function scriptScriptListener(data: any) {
      // console.info('on script status', data)
      logger.info(`on script status` + JSON.stringify(data));
      if (data.status === "destroy") {
        clearListener();
        resolve(data);
      }
    }
    function clearListener() {
      console.info("clear listener");
      client.emitter?.off("script:log", scriptLogListener);
      client.emitter?.off("script:status", scriptScriptListener);
    }

    client.emitter?.on("script:log", scriptLogListener);
    client.emitter?.on("script:status", scriptScriptListener);
    client.on("close", clearListener);
    client.on("error", clearListener);
    console.info(`start script`);

    // setTimeout(() => {
    //   jobLogger.error("autojs执行超时");
    //   clearListener();
    //   resolve({ status: "timeout" });
    // }, 10000);
  });
});

const port = 9991;
const executorConfig: Partial<IExecutorOptions<any>> = config.has("executor")
  ? config.get("executor")
  : {};

const app = express();
app.use(express.json());

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  logger.info(`Server started on port ${port}`);
  logger.info(`Executor config: ${JSON.stringify(executorConfig)}`);

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


