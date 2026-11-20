// Controllers
const Video = require("./controllers/video");

const routes = [
  // Return the list of all uploaded videos
  { method: "GET", path: "/api/videos", handler: Video.getVideos },

  // Upload a video file
  { method: "POST", path: "/api/upload", handler: Video.uploadVideo },

  // Resize a video file (creates a new video file, processed in the background)
  { method: "POST", path: "/api/resize", handler: Video.resizeVideo },

  // Return a video/thumbnail asset to the client
  { method: "GET", path: "/api/asset", handler: Video.getVideoAsset },
];

module.exports = (req, res, next) => {
  const route = routes.find(
    (route) => route.method === req.method && route.path === req.pathname
  );

  if (!route) return next();

  const handleErr = (err) => next(err);

  Promise.resolve(route.handler(req, res, handleErr)).catch(handleErr);
};
