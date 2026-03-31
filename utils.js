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
require("colors.ts");
const DEFAULT_READ_SIZE = 64 * 1024;
const DIRECTORY_ENTRY_RE = /[\\/]$/;
const EMPTY_UINT8_ARRAY = new Uint8Array(0);
/** @type {function(string): string} */
const section = (title) => /** @type {any} */(title.bold).underline;
/** @type {function(string,string,string=): string} */
const optionLine = (flag, desc, note = "") => {
  return `  ${flag.padEnd(26).cyan}${desc.white}${note ? ` ${note.gray(14)}` : ""}`;
};
/** @type {function(string,string): string} */
const exampleLine = (cmd, desc) => {
  return `  ${cmd.green}${desc ? `  ${desc.gray(14)}` : ""}`;
};
const printHelp = () => {
  const pkg = require("./package.json");
  const cliName = Object.keys(pkg.bin)[0];
  const divider = "-".repeat(72).hex("444444");
  console.log(
    [
      "",
      divider,
      `${cliName.magenta.bold} ${`v${pkg.version}`.gray(14)}`,
      `${pkg.description.hex("7cc5ff")}`,
      divider,
      "",
      section("Usage"),
      `  ${cliName.magenta.bold} ${"[-v] [-p|-progress] [-d <dir>] [-m|-mode <stream|memory>]".cyan} ${"<zip-file> [more.zip ...]".white.bold}`,
      "",
      section("Options"),
      optionLine("-d <dir>", "extract into this directory", "(default: ./output)"),
      optionLine("-v", "print verbose entry logs"),
      optionLine("-p, -progress", "show single-line progress", "(implies -v)"),
      optionLine("-m, -mode <name>", "choose unzip mode", "(stream default / memory legacy)"),
      optionLine("-h, -help", "show this help"),
      "",
      section("Examples"),
      exampleLine(`${cliName} archive.zip`, "extract with streaming mode"),
      exampleLine(`${cliName} -d ./output bundle.zip`, "extract into a custom directory"),
      exampleLine(`${cliName} -p -mode memory huge.zip`, "legacy memory mode with progress"),
      "",
      section("Modes"),
      `  ${"stream".cyan.bold} ${"keeps memory usage lower for large ZIP files".gray(14)}`,
      `  ${"memory".yellow} ${"uses the previous all-at-once extraction path".gray(14)}`,
      ""
    ].join("\n")
  );
};
const log = console.log.bind(console, "[unzip]:".magenta);
/** @type {(name: string) => void} */
const logUnzipDone = zipNamne => log(`${zipNamne.cyan} unzip done`);
/**
 * @param {unknown} error
 * @returns {string}
 */
const getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
/**
 * @param {string} zipName
 * @param {unknown} error
 */
const logUnzipError = (zipName, error) => {
  log(`${zipName.red} unzip failed${`: ${getErrorMessage(error)}`.yellow}`);
};
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
  createEntryWriter,
  log,
  logUnzipDone,
  logUnzipError,
  printHelp
};