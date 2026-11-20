const cluster = require("node:cluster");
const TaskQueue = require("../lib/TaskQueue.js");

if (cluster.isPrimary) {
  const jobs = new TaskQueue();

  const coreCount = require("node:os").availableParallelism();
  for (let i = 0; i < coreCount; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker, message) => {
    if (message.messageType === "new-resize") {
      const { videoId, height, width } = message.data;
      jobs.enqueue({
        type: "resize",
        videoId,
        width,
        height,
      });
    }
  });

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} down (${signal} | ${code}). Trying to restart...`,
    );
    cluster.fork();
  });
} else {
  require("./index.js");
}
