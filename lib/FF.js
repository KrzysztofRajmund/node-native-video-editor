const { spawn } = require("node:child_process");

// Captures a single frame at the 5s mark as a JPEG thumbnail
const makeThumbnail = (fullPath, thumbnailPath) => {
  // ffmpeg -i video.mp4 -ss 5 -vframes 1 thumbnail.jpg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      fullPath,
      "-ss",
      "5",
      "-vframes",
      "1",
      thumbnailPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`FFmpeg existed with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
};

// Reads the video's width/height via ffprobe
const getDimensions = (fullPath) => {
  // ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 video.mp4
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      fullPath,
    ]);

    let dimensions = "";
    ffprobe.stdout.on("data", (data) => {
      dimensions += data.toString("utf8");
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        dimensions = dimensions.replace(/\s/g, "").split(",");
        resolve({
          width: Number(dimensions[0]),
          height: Number(dimensions[1]),
        });
      } else {
        reject(`FFprobe existed with this code: ${code}`);
      }
    });

    ffprobe.on("error", (err) => {
      reject(err);
    });
  });
};

// Rescales a video to the given dimensions, keeping the original audio track
const resize = (originalVideoPath, targetVideoPath, width, height) => {
  return new Promise((resolve, reject) => {
    // ffmpeg -i video.mp4 -vf scale=320:240 -c:a copy video-320x240.mp4
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      originalVideoPath,
      "-vf",
      `scale=${width}x${height}`,
      "-c:a",
      "copy",
      "-threads",
      "2",
      "-loglevel",
      "error",
      "-y",
      targetVideoPath,
    ]);

    ffmpeg.stderr.on("data", (data) => {
      console.log(data.toString("utf8"));
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`FFmpeg existed with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
};

// Reads the dominant color and a short palette from a thumbnail image via the native color_palette binary
const getPalette = (imagePath) => {
  return new Promise((resolve, reject) => {
    const proc = spawn("./native/bin/color_palette", [imagePath]);

    let output = "";
    proc.stdout.on("data", (data) => {
      output += data.toString("utf8");
    });

    proc.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(e);
        }
      } else {
        reject(`color_palette existed with this code: ${code}`);
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
};

module.exports = { makeThumbnail, getDimensions, resize, getPalette };
