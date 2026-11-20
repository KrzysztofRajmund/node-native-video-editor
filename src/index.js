const http = require("node:http");
const { parse } = require("node:url");
const { serveStatic, parseJSON } = require("./middleware/index.js");
const router = require("./router.js");

const PORT = 8080;

/* -- Middlewares (run in order for every request) -- */
const middlewares = [
  serveStatic("./public"), // serve the plain html/css/js frontend
  parseJSON, // parse JSON bodies into req.body
];

// Runs the middleware chain, then the router, then the final error handler
function handle(req, res) {
  let i = 0;

  function next(err) {
    if (err) return finish(err);

    const middleware = middlewares[i++];
    if (!middleware) return router(req, res, finish);

    try {
      middleware(req, res, next);
    } catch (e) {
      finish(e);
    }
  }

  function finish(error) {
    if (res.writableEnded) return;

    if (error) {
      const status = error.status || 500;
      const message =
        status === 500
          ? "Sorry, something unexpected happened from our side."
          : error.message;
      if (status === 500) console.error(error);
      return res.status(status).json({ error: message });
    }

    res.status(404).json({ error: "Not found" });
  }

  next();
}

const server = http.createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  req.pathname = parsedUrl.pathname;
  req.query = parsedUrl.query;

  // Small response helpers, similar in spirit to res.status()/res.json()
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };

  handle(req, res);
});

server.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});
