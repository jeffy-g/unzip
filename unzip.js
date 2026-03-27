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
/**
 * @type {ReturnType<typeof tinArgs<TUnzipArgs>>}
 */
const params = tinArgs();
let $type = "---";
let $path = "---";
let state = "---";
let count = 0;
const emitStatLine = () => {
  return `extracting(${(count + "").padStart(5)}) | type: ${$type.padEnd(6)} | ${state.padEnd(7)} | path: ${$path}`
};
/** @type {progress.TProgressLight} */
const pbar = progress.create(25, emitStatLine);
const log = console.log.bind(console, "[unzip]:".magenta);
/** @type {(name: string) => void} */
const finalLog = zipNamne => log(`"${zipNamne}" unzip done`);
/** @type {TUnzipCallback[]} */
const handlerSlots = [
  e => {
    if (typeof e === "string") {
      finalLog(e);
      return;
    }
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
  e => {
    if (typeof e === "string") {
      pbar.stop();
      pbar.newLine();
      finalLog(e);
      return;
    }
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
const verbose = params.v;
const useProgress = !!(params.p || params.progress);
/** @type {TUnzipCallback} */
const withCallback = (() => {
  if (verbose) {
    return handlerSlots[
      +useProgress
    ];
  }
  return e => {};
})();
const dest = params.d || "./output";
const mode = params.mode === "memory" ? "memory" : "stream";
const unzipRunner = mode === "memory"
  ? unzipWithCallback.memory
  : unzipWithCallback.stream;
params.args?.forEach((zipPath) => {
  console.log(`ffunzip: processing(${mode}) - ${zipPath}`);
  useProgress && pbar.run();
  unzipRunner(zipPath, dest, withCallback);
});