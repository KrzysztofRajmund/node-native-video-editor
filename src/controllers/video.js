const path = require("node:path");
const cluster = require("node:cluster");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { pipeline } = require("node:stream/promises");
const util = require("../../lib/util");
const DB = require("../DB");
const FF = require("../../lib/FF");

let jobs;
if (cluster.isPrimary) {
  const TaskQueue = require("../../lib/TaskQueue");
  jobs = new TaskQueue();
}

const FORMATS_SUPPORTED = ["mov", "mp4"];

// Return the list of all uploaded videos
const getVideos = (req, res) => {
  DB.update();
  res.status(200).json(DB.videos);
};

// Upload a video file
const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;

  if (!specifiedFileName) {
    return handleErr({ status: 400, message: "Missing 'filename' header." });
  }

  const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");

  if (FORMATS_SUPPORTED.indexOf(extension) === -1) {
    return handleErr({
      status: 400,
      message: "Only these formats are allowed: mov, mp4",
    });
  }

  try {
    await fs.mkdir(`./storage/${videoId}`, { recursive: true });
    const fullPath = `./storage/${videoId}/original.${extension}`; // the original video path
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();
    const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;

    await pipeline(req, fileStream);

    // Make a thumbnail for the video file
    await FF.makeThumbnail(fullPath, thumbnailPath);

    // Get the dimensions
    const dimensions = await FF.getDimensions(fullPath);

    DB.update();
    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      name,
      extension,
      dimensions,
      resizes: {},
    });
    DB.save();

    res.status(201).json({
      status: "success",
      message: "The file was uploaded successfully!",
    });
  } catch (e) {
    // Delete the folder
    util.deleteFolder(`./storage/${videoId}`);
    if (e.code !== "ECONNRESET") return handleErr(e);
  }
};

// Resize a video file (creates a new video file)
const resizeVideo = async (req, res, handleErr) => {
  const videoId = req.body.videoId;
  const width = Number(req.body.width);
  const height = Number(req.body.height);

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({ status: 404, message: "Video not found!" });
  }

  video.resizes[`${width}x${height}`] = { processing: true };
  DB.save();

  if (cluster.isPrimary) {
    jobs.enqueue({
      type: "resize",
      videoId,
      width,
      height,
    });
  } else {
    process.send({
      messageType: "new-resize",
      data: { videoId, width, height },
    });
  }

  res.status(200).json({
    status: "success",
    message: "The video is now being processed!",
  });
};

// Return a video/thumbnail asset to the client
const getVideoAsset = async (req, res, handleErr) => {
  const videoId = req.query.videoId;
  const type = req.query.type; // thumbnail, original, resize

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({ status: 404, message: "Video not found!" });
  }

  let file;
  let mimeType;
  let filename; // the final file name for the download (including the extension)

  try {
    switch (type) {
      case "thumbnail":
        file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
        mimeType = "image/jpeg";
        break;
      case "resize": {
        const dimensions = req.query.dimensions;
        file = await fs.open(
          `./storage/${videoId}/${dimensions}.${video.extension}`,
          "r",
        );
        mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
        filename = `${video.name}-${dimensions}.${video.extension}`;
        break;
      }
      case "original":
      default:
        file = await fs.open(
          `./storage/${videoId}/original.${video.extension}`,
          "r",
        );
        mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
        filename = `${video.name}.${video.extension}`;
        break;
    }

    // Grab the file size
    const stat = await file.stat();
    const fileStream = file.createReadStream();

    if (type !== "thumbnail") {
      // Set a header to prompt for download
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    }

    // Set the Content-Type header based on the file type
    res.setHeader("Content-Type", mimeType);
    // Set the Content-Length to the size of the file
    res.setHeader("Content-Length", stat.size);

    res.status(200);

    await pipeline(fileStream, res);
    file.close();
  } catch (e) {
    return handleErr({ status: 404, message: "Asset not found." });
  }
};

const controller = {
  getVideos,
  uploadVideo,
  resizeVideo,
  getVideoAsset,
};

module.exports = controller;
