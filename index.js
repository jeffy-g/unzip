/*!
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  Copyright (C) 2024 jeffy-g <hirotom1107@gmail.com>
  Released under the MIT license
  https://opensource.org/licenses/mit-license.php
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/
/// <reference path="./ffunzip.d.ts"/>
const fs = require("fs");
const path = require("path");
const fflate = require("fflate");
const {
  DEFAULT_READ_SIZE,
  EMPTY_UINT8_ARRAY,
  createDirectoryCache,
  resolveOutputPath,
  createEntryInfo,
  createEntryWriter
} = require("./utils");
require("colors.ts");
/**
 * @param {string} fileName
 * @param {string} destDir
 * @param {TUnzipCallback} cb
 * @returns {Promise<string>}
 */
const unzipMemoryWithCallback = (fileName, destDir, cb) => {
  return new Promise((resolve, reject) => {
    const destRoot = path.resolve(destDir);
    const { mkdirs, clear } = createDirectoryCache();
    try {
      mkdirs(destRoot);
    } catch (e) {
      clear();
      reject(e);
      return;
    }
    fs.readFile(fileName, null, (err, data) => {
      if (err) {
        clear();
        reject(err);
        return;
      }
      /** @type {(file: UnzipFileInfo) => boolean} */
      const filter = (file) => {
        cb(createEntryInfo(file.name, file.originalSize ?? 0, "info"));
        return true;
      };
      fflate.unzip(data, { filter }, async (unzipError, unzipped) => {
        if (unzipError) {
          clear();
          reject(unzipError);
          return;
        }
        try {
          /** @type {Promise<void>[]} */
          const promises = [];
          for (const [entryPath, entryData] of Object.entries(unzipped)) {
            /**
             * @see {@link knownDirectories push the dirs}
             * @see {@link mkdirs check already created}
             */
            const info = createEntryInfo(entryPath, entryData.length, "pending");
            const outputPath = resolveOutputPath(destRoot, entryPath);
            if (info.type === "Folder") {
              mkdirs(outputPath);
              info.state = "ignore";
              cb(info);
              continue;
            }
            cb(info);
            mkdirs(path.dirname(outputPath));
            promises.push(
              fs.promises.writeFile(outputPath, entryData).then(() => {
                info.state = "write";
                cb(info);
              })
            );
          }
          await Promise.all(promises);
          cb(fileName);
          resolve(fileName);
        } catch (e) {
          reject(e);
        } finally {
          clear();
        }
      });
    });
  });
};
/**
 * @param {string} fileName zip file path
 * @param {string} destDir output directory path
 * @param {TUnzipCallback} cb
 * @returns {Promise<string>}
 */
const unzipWithCallback = (fileName, destDir, cb) => {
  return new Promise((resolve, reject) => {
    const destRoot = path.resolve(destDir);
    const { mkdirs, clear } = createDirectoryCache();
    const readStream = fs.createReadStream(fileName, {
      highWaterMark: DEFAULT_READ_SIZE
    });
    const unzipper = new fflate.Unzip();
    let pendingEntries = 0;
    let sourceEnded = false;
    let settled = false;
    const finalize = () => {
      if (settled || !sourceEnded || pendingEntries !== 0) return;
      settled = true;
      clear();
      cb(fileName);
      resolve(fileName);
    };
    /**
     * @param {unknown} err
     */
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clear();
      readStream.destroy();
      terminators.forEach((terminate) => {
        try {
          terminate();
        } catch {}
      });
      reject(err);
    };
    /**
     * @param {TSimpleZipEntry} info
     * @param {TUnzipEntryState} state
     * @returns {TSimpleZipEntry}
     */
    const chStat = (info, state) => ({ ...info, state });
    /** @type {Set<() => void>} */
    const terminators = new Set();
    try {
      mkdirs(destRoot);
    } catch (e) {
      fail(e);
      return;
    }
    unzipper.register(fflate.UnzipInflate);
    unzipper.onfile = (file) => {
      if (settled) return;
      const info = createEntryInfo(file.name, file.originalSize ?? 0, "info");
      cb(info);
      let outputPath = "";
      try {
        outputPath = resolveOutputPath(destRoot, file.name);
      } catch (e) {
        fail(e);
        return;
      }
      if (info.type === "Folder") {
        try {
          mkdirs(outputPath);
        } catch (e) {
          fail(e);
          return;
        }
        cb(chStat(info, "ignore"));
        return;
      }
      try {
        mkdirs(path.dirname(outputPath));
      } catch (e) {
        fail(e);
        return;
      }
      cb(chStat(info, "pending"));
      pendingEntries++;
      let entryDone = false;
      const terminate = file.terminate;
      terminators.add(terminate);
      const finishEntry = () => {
        if (entryDone) return;
        entryDone = true;
        pendingEntries--;
        terminators.delete(terminate);
        cb(chStat(info, "write"));
        finalize();
      };
      /**
       * @param {unknown} err
       */
      const failEntry = (err) => {
        if (!entryDone) {
          entryDone = true;
          pendingEntries--;
        }
        terminators.delete(terminate);
        fail(err);
      };
      const writer = createEntryWriter(outputPath, readStream, finishEntry, failEntry);
      file.ondata = writer.ondata;
      try {
        file.start();
      } catch (e) {
        failEntry(e);
      }
    };
    readStream.on("data", (/** @type {NonSharedBuffer} */chunk) => {
      if (settled) return;
      try {
        unzipper.push(chunk, false);
      } catch (e) {
        fail(e);
      }
    }).once("error", (err) => {
      fail(err);
    }).once("end", () => {
      if (settled) return;
      try {
        unzipper.push(EMPTY_UINT8_ARRAY, true);
        sourceEnded = true;
        finalize();
      } catch (e) {
        fail(e);
      }
    });
  });
};
unzipWithCallback.version = "v1.2.4";
unzipWithCallback.stream = unzipWithCallback;
unzipWithCallback.memory = unzipMemoryWithCallback;
unzipWithCallback.legacy = unzipMemoryWithCallback;
module.exports = unzipWithCallback;