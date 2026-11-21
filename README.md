# node-native-video-editor

A lightweight video editor built with only Node.js core modules, the `ffmpeg`/`ffprobe` CLI tools, and a native C++ binary for color palette extraction. Upload videos, get thumbnails, and resize them in the background via a task queue.

## Prerequisites

- Node.js
- `ffmpeg` and `ffprobe` available on your `PATH`
- A C++ compiler (only needed if you rebuild the native binary)

## Getting started

```bash
# build the native color_palette binary (only needed once, or after changes to native/)
npm run build:native

# start the server (single process)
npm start

# or start it with a cluster of worker processes
npm run cluster
```

The server listens on `http://localhost:8080`. The frontend is served from `public/`, and the API is available under `/api` (`/api/videos`, `/api/upload`, `/api/resize`, `/api/asset`).
