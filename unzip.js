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
const helpRequested = !!(params.h || params.help);
if (helpRequested) {
  const pkg = require("./package.json");
  const cliName = Object.keys(pkg.bin)[0];
  const divider = "-".repeat(72).hex("444444");
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
  process.exit(0);
}
const useProgress = !!(params.p || params.progress);
const verbose = useProgress || params.v;
const modeName = (params.m || params.mode);
let $type = "---";
let $path = "---";
let state = "---";
let count = 0;
const emitStatLine = () => {
  return `extracting(${(count + "").padStart(5)}) | type: ${$type.padEnd(6)} | ${state.padEnd(7)} | path: ${$path}`
};
const log = console.log.bind(console, "[unzip]:".magenta);
/** @type {progress.TProgressLight} */
let pbar;
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
/** @type {TUnzipCallback} */
const withCallback = (() => {
  if (verbose) {
    useProgress && (pbar = progress.create(25, emitStatLine));
    return handlerSlots[
      +useProgress
    ];
  }
  return e => {
    if (typeof e === "string") {
      finalLog(e);
    }
  };
})();
const dest = params.d || "./output";
const mode = modeName === "memory" ? "memory" : "stream";
const unzipRunner = mode === "memory"
  ? unzipWithCallback.memory
  : unzipWithCallback.stream;
params.args?.forEach((zipPath) => {
  console.log(`ffunzip: processing(${mode}) - ${zipPath}`);
  useProgress && pbar.run();
  unzipRunner(zipPath, dest, withCallback);
});