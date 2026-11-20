const fs = require("node:fs");
const path = require("node:path");

// Maps file extensions to Content-Type headers; anything else falls back to octet-stream
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
};

// Middleware factory: serves static files from rootDir, rejecting non-GET requests and path traversal attempts
exports.serveStatic = (rootDir) => {
  const resolvedRoot = path.resolve(rootDir);

  return (req, res, next) => {
    if (req.method !== "GET") return next();

    const urlPath = req.pathname === "/" ? "/index.html" : req.pathname;
    const resolvedPath = path.resolve(resolvedRoot, "." + urlPath);

    // Reject paths that resolve outside rootDir (e.g. via "../")
    if (!resolvedPath.startsWith(resolvedRoot)) return next();

    fs.readFile(resolvedPath, (err, data) => {
      if (err) return next();
      res.setHeader(
        "Content-Type",
        MIME_TYPES[path.extname(resolvedPath)] || "application/octet-stream",
      );
      res.statusCode = 200;
      res.end(data);
    });
  };
};

// Middleware: parses JSON bodies into req.body; skips requests with a non-JSON content type
exports.parseJSON = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) return next();

  let rawBody = "";
  req.on("data", (chunk) => (rawBody += chunk));
  req.on("end", () => {
    try {
      req.body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
      // Invalid JSON: fall back to an empty body instead of throwing
      req.body = {};
    }
    next();
  });
};
