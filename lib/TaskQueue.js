const DB = require("../src/DB");
const FF = require("./FF");
const util = require("./util");

class TaskQueue {
  constructor() {
    this.jobs = [];
    this.currentJob = null;

    // Resume any resizes that were left unfinished (e.g. after a restart)
    DB.update();
    DB.videos.forEach((video) => {
      Object.keys(video.resizes).forEach((key) => {
        if (video.resizes[key].processing) {
          const [width, height] = key.split("x");
          this.enqueue({
            type: "resize",
            videoId: video.videoId,
            width,
            height,
          });
        }
      });
    });
  }

  enqueue(job) {
    this.jobs.push(job);
    this.executeNext();
  }

  dequeue() {
    return this.jobs.shift();
  }

  // Starts the next job only if nothing is currently running
  executeNext() {
    if (this.currentJob) return;
    this.currentJob = this.dequeue();
    if (!this.currentJob) return;
    this.execute(this.currentJob);
  }

  async execute(job) {
    if (job.type === "resize") {
      const { videoId, width, height } = job;

      DB.update();
      const video = DB.videos.find((video) => video.videoId === videoId);

      const originalVideoPath = `./storage/${video.videoId}/original.${video.extension}`;
      const targetVideoPath = `./storage/${video.videoId}/${width}x${height}.${video.extension}`;

      try {
        await FF.resize(originalVideoPath, targetVideoPath, width, height);

        // Re-fetch in case DB.videos was reloaded while resizing
        DB.update();
        const video = DB.videos.find((video) => video.videoId === videoId);
        video.resizes[`${width}x${height}`].processing = false;
        DB.save();

        console.log(
          `Resize complete for video ${videoId} (${width}x${height}). Jobs remaining: ${this.jobs.length}`,
        );
      } catch (e) {
        // Clean up the partial output file on failure
        util.deleteFile(targetVideoPath);
        console.log(
          `Resize failed for video ${videoId} (${width}x${height}). Jobs remaining: ${this.jobs.length}`,
          e,
        );
      }
    }

    this.currentJob = null;
    this.executeNext();
  }
}

module.exports = TaskQueue;
