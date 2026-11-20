const fs = require("node:fs");

const videosPath = "./data/videos.json";

class DB {
  constructor() {
    this.videos = JSON.parse(fs.readFileSync(videosPath, "utf8"));
  }

  update() {
    this.videos = JSON.parse(fs.readFileSync(videosPath, "utf8"));
  }

  save() {
    fs.writeFileSync(videosPath, JSON.stringify(this.videos));
  }
}

const db = new DB();

module.exports = db;
