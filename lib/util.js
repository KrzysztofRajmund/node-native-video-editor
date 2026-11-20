const fs = require("node:fs/promises");

const util = {};

// Delete a file if exits, will log an error if it fails
util.deleteFile = async (path) => {
  try {
    await fs.unlink(path);
  } catch (e) {
    console.log(e);
  }
};

// Delete a folder if exits, will log an error if it fails
util.deleteFolder = async (path) => {
  try {
    await fs.rm(path, { recursive: true });
  } catch (e) {
    console.log(e);
  }
};

module.exports = util;
