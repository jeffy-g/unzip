#!/usr/bin/env node
/// <reference path="./ffunzip.d.ts"/>
"use strict";
/*!
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  Copyright (C) 2024 jeffy-g <hirotom1107@gmail.com>
  Released under the MIT license
  https://opensource.org/licenses/mit-license.php
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/
const tinArgs = require("tin-args");
const progress = require("./progress-light");
const unzipWithCallback = require("./index");
const {
  log,
  printHelp,
  logUnzipDone, logUnzipError,
} = require("./utils");
/**
 * @type {ReturnType<typeof tinArgs<TUnzipArgs>>}
 */
const params = tinArgs();
const helpRequested = !!(params.h || params.help);
if (helpRequested) {
  printHelp();
  process.exit(0);
}
const useProgress = !!(params.p || params.progress);
const verbose = useProgress || params.v;
const modeName = (params.m || params.mode);
let $type = "---";
let $path = "---";
let state = "---";
let currentZip = "";
let count = 0;
const emitStatLine = () => {
  return `zipFile: ${currentZip} | extracting(${String(count).padStart(6)}) | type: ${$type.padEnd(6)} | ${state.padEnd(7)} | path: ${$path}`
};
/** @type {progress.TProgressLight=} */
let pbar;
/** @type {(method: keyof Omit<progress.TProgressLight, "updateOptions" | "setFPS">) => void} */
const callProgressMethod = (method) => {
  pbar && pbar[method]();
};
/**
 * @typedef {(zipName: string) => TUnzipCallback} TUnzipCallbackWrapper
 */
/** @type {TUnzipCallbackWrapper[]} */
const handlerSlots = [
  () => e => {
    if (typeof e === "string") return;
    if (e.state === "info") {
      log(`zip info [${e.type === "File" ? "f": "d"}]: ${e.path}`.hex("444444"));
    }
    else if (e.state === "ignore" || e.type === "Folder") {
    } else {
      const state = e.state;
      const color = state === "pending" ? "cyan": "green";
      log(`${state} - ${e.path[color]}${
        state !== "write" ? `, size: ${e.size?.toLocaleString().blue}`: ""
      }`);
    }
  },
  zipName => e => {
    if (typeof e === "string") return;
    currentZip = zipName;
    if (e.state === "info") {
      $path = e.path.hex("444444");
      $type = e.type === "File" ? "file": "folder";
    }
    else if (e.state === "ignore" || e.type === "Folder") {
    } else {
      state = e.state;
      state === "write" && count++;
      const color = state === "pending" ? "cyan": "green";
      $path = e.path[color];
    }
  }
];
/** @type {TUnzipCallbackWrapper} */
const withCallback = (() => {
  if (verbose) {
    useProgress && (pbar = progress.create(25, emitStatLine));
    return handlerSlots[
      +useProgress
    ];
  }
  return () => () => {};
})();
const dest = params.d || "./output";
const mode = modeName === "memory" ? "memory" : "stream";
const unzipRunner = mode === "memory"
  ? unzipWithCallback.memory
  : unzipWithCallback.stream;
/**
 * @param {string} zipPath
 * @returns {Promise<void>}
 */
const runSingleZip = async (zipPath) => {
  try {
    await unzipRunner(zipPath, dest, withCallback(zipPath));
    callProgressMethod("newLine");
    logUnzipDone(zipPath);
  } catch (error) {
    process.exitCode = 1;
    callProgressMethod("newLine");
    logUnzipError(zipPath, error);
  } finally {
    currentZip = "";
  }
};
async function main() {
  const zipFiles = params.args;
  if (!zipFiles?.length) {
    return;
  }
  callProgressMethod("run");
  try {
    await Promise.allSettled(zipFiles.map((zipPath) => {
      console.log(`ffunzip: processing(${mode}) - ${zipPath}`);
      return runSingleZip(zipPath);
    }));
  } finally {
    callProgressMethod("stop");
  }
}
main().catch(console.error);