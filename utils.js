/*!
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//  Copyright (C) 2026 jeffy-g <hirotom1107@gmail.com>
//  Released under the MIT license
//  https://opensource.org/licenses/mit-license.php
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/
/**
 * @file utils.js
 */
/// <reference path="./ffunzip.d.ts"/>
const fs = require("fs");
const path = require("path");
const DEFAULT_READ_SIZE = 64 * 1024;
const DIRECTORY_ENTRY_RE = /[\\/]$/;
const EMPTY_UINT8_ARRAY = new Uint8Array(0);
/**
 * @returns {{ mkdirs: (parent: string) => void; clear: () => void; }}
 */
const createDirectoryCache = () => {
  /**
   * push already created directries
   * @type {Set<string>}
   */
  const knownDirectories = new Set();
  /**
   * @param {string} parent
   */
  const mkdirs = (parent) => {
    if (!knownDirectories.has(parent)) {
      fs.mkdirSync(parent, { recursive: true });
      knownDirectories.add(parent);
    }
  };
  return {
    mkdirs,
    clear: () => {
      knownDirectories.clear();
    }
  };
};
/**
 * @param {string} destRoot
 * @param {string} entryPath
 */
const resolveOutputPath = (destRoot, entryPath) => {
  const outputPath = path.resolve(destRoot, entryPath);
  const relativePath = path.relative(destRoot, outputPath);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Illegal zip entry path: ${entryPath}`);
  }
  return outputPath;
};
/**
 * @param {string} entryPath
 * @param {number} size
 * @param {TUnzipEntryState} state
 * @returns {TSimpleZipEntry}
 */
const createEntryInfo = (entryPath, size, state) => ({
  state,
  type: DIRECTORY_ENTRY_RE.test(entryPath) ? "Folder" : "File",
  path: entryPath,
  size
});
/**
 * @param {string} outputPath
 * @param {fs.ReadStream} sourceStream
 * @param {() => void} onDone
 * @param {(error: Error) => void} onError
 */
const createEntryWriter = (outputPath, sourceStream, onDone, onError) => {
  /** @type {fs.WriteStream | null} */
  let writer = null;
  /** @type {Uint8Array[]} */
  const queuedChunks = [];
  let waitingDrain = false;
  let finalReceived = false;
  let settled = false;
  const cleanup = () => {
    if (!writer) {
      return;
    }
    writer.removeListener("drain", flushQueuedChunks);
    writer.removeListener("error", handleWriteError);
    writer.removeListener("finish", handleFinish);
  };
  const ensureWriter = () => {
    if (writer) {
      return writer;
    }
    writer = fs.createWriteStream(outputPath);
    writer.on("drain", flushQueuedChunks);
    writer.on("error", handleWriteError);
    writer.on("finish", handleFinish);
    return writer;
  };
  const finishIfReady = () => {
    if (!finalReceived || waitingDrain || queuedChunks.length || settled) return;
    ensureWriter().end();
  };
  const flushQueuedChunks = () => {
    if (settled) return;
    waitingDrain = false;
    const activeWriter = ensureWriter();
    while (queuedChunks.length) {
      const chunk = queuedChunks.shift();
      if (!activeWriter.write(chunk)) {
        waitingDrain = true;
        return;
      }
    }
    finishIfReady();
    if (!waitingDrain && sourceStream.isPaused()) {
      sourceStream.resume();
    }
  };
  /**
   * @param {Error} error
   */
  const fail = (error) => {
    if (settled) return;
    settled = true;
    cleanup();
    writer && writer.destroy();
    onError(error);
  };
  /**
   * @param {Error} error
   */
  const handleWriteError = (error) => {
    fail(error);
  };
  const handleFinish = () => {
    if (settled) return;
    settled = true;
    cleanup();
    onDone();
  };
  return {
    /**
     * @param {Error | null} error
     * @param {Uint8Array} chunk
     * @param {boolean} final
     */
    ondata(error, chunk, final) {
      if (error) {
        fail(error);
        return;
      }
      if (settled) return;
      if ((chunk && chunk.length) || final) {
        ensureWriter();
      }
      if (chunk && chunk.length) {
        if (waitingDrain || queuedChunks.length) {
          queuedChunks.push(chunk);
        } else if (!ensureWriter().write(chunk)) {
          waitingDrain = true;
          sourceStream.pause();
        }
      }
      if (!final) return;
      finalReceived = true;
      finishIfReady();
    }
  };
};
module.exports = {
  DEFAULT_READ_SIZE,
  EMPTY_UINT8_ARRAY,
  createDirectoryCache,
  resolveOutputPath,
  createEntryInfo,
  createEntryWriter
};