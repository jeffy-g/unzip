/*!
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  Copyright (C) 2026 jeffy-g <hirotom1107@gmail.com>
  Released under the MIT license
  https://opensource.org/licenses/mit-license.php
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/
"use strict";
/**
 * [usage]
 * > node -i
 * let t = require("./progress-light");
 * let p = t.create();
 * p.run();
 * p.stop();
 */
const rl = require("readline");
/**
 * @typedef {{ fmt: string, payload?: Record<string, string> }} ProgressFormatOptions
 */
/**
 * @typedef {{
 *   updateOptions(newFrames?: string[], newOpt?: ProgressFormatOptions): void;
 *   deadline(): void;
 *   newLine(): void;
 *   setFPS(fps: number): void;
 *   renderSync(): void;
 *   run(): void;
 *   stop(): void;
 *   isRunning(): boolean;
 * }} TProgressLight
 */
/**
 * @param {boolean} enabled
 * @param {NodeJS.WriteStream} [output]
 */
const cursor = (enabled, output = process.stderr) => {
  if (enabled) {
    output.write("\x1B[?25h");
  } else {
    output.write("\x1B[?25l");
  }
};
/**
 * @param {string=} msg
 * @param {number=} row
 */
const renderLine = (msg, row) => {
  const output = process.stderr || process.stdout;
  rl.cursorTo(output, 0, row);
  msg && (output.write(msg), rl.clearLine(output, 1));
};
/**
 * @param {string[]} frames
 * @param {ProgressFormatOptions} [formatOpt]
 */
const createProgressSync = (frames, formatOpt) => {
  const fsize = frames.length;
  let index = 0;
  /** @type {string | undefined} */
  let fmt;
  /** @type {Record<string, string>} */
  let payload = {};
  /** @type {string[]} */
  let keys = [];
  if (formatOpt) {
    fmt = formatOpt.fmt;
    payload = formatOpt.payload || {};
    keys = Object.keys(payload);
  }
  /**
   * @param {string} tick
   * @param {string} msg
   */
  const formatter = (tick, msg) => {
    if (fmt) {
      let content = fmt;
      for (let i = 0, end = keys.length; i < end; ) {
        const key = keys[i++];
        content = content.replace("{" + key + "}", payload[key]);
      }
      return content.replace("{tick}", tick).replace("{msg}", msg);
    }
    return `[${tick}]: ${msg}`;
  };
  return /** @type {(msg: string, done?: boolean) => void} */ ((msg, done = false) => {
    const tick = done ? "-done-" : frames[index++ % fsize];
    const line = msg ? formatter(tick, msg) : "";
    renderLine(line);
  });
};
/**
 * @param {string[]} frames
 * @param {ProgressFormatOptions} formatOpt
 * @param {() => string} messageEmitter
 * @returns {TProgressLight}
 */
const createProgressObject = (frames, formatOpt, messageEmitter) => {
  let done = false;
  const render = () => {
    progress(messageEmitter(), done);
  };
  let progress = createProgressSync(frames, formatOpt);
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timer;
  let ms = 33;
  return {
    updateOptions(newFrames, newOpt) {
      if (Array.isArray(newFrames) && typeof newFrames[0] === "string") {
        frames = newFrames;
      }
      if (typeof newOpt === "object" && newOpt && newOpt.fmt) {
        formatOpt = newOpt;
      }
      done = false;
      progress = createProgressSync(frames, formatOpt);
    },
    deadline() {
      (done = true), render();
    },
    newLine() {
      console.log();
    },
    setFPS(fps) {
      ms = (1000 / fps) | 0;
      if (timer) {
        clearInterval(timer);
        timer = setInterval(render, ms);
      }
    },
    renderSync() {
      progress(messageEmitter(), done);
    },
    run() {
      cursor(false);
      done = false;
      if (timer) {
        return;
      }
      timer = setInterval(render, ms);
    },
    stop() {
      done = true;
      clearInterval(timer);
      timer = void 0;
      cursor(true);
    },
    isRunning() {
      return !!timer;
    },
  };
};
let fired = 0;
let pending = 0;
/** @type {() => { fired: number; pending: number; errors?: number; }} */
const cb = () => {
  return {
    fired: ++fired,
    pending: ++pending,
  };
};
let tag = "progress test";
/**
 * progress callback
 * @type {() => string}
 */
const pcb = () => {
  if (cb) {
    const { fired, pending, errors } = cb();
    return `${tag} | error: ${(errors + "").padEnd(3)} | send: ${(fired + "").padStart(3)}, pending: ${(pending + "").padEnd(5)}`;
  } else {
    return "- - error - -";
  }
};
/**
 * @param {number} [fps]
 * @param {() => string} [messageEmitter]
 * @returns {TProgressLight}
 */
const create = (fps = 30, messageEmitter) => {
  const frames = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏",
  ];
  !messageEmitter && (messageEmitter = pcb);
  /** @type {TProgressLight} */
  const progress = createProgressObject(
    frames, {
      fmt: "{tick} - {msg}",
      payload: {},
    },
    messageEmitter,
  );
  progress.setFPS(fps);
  return progress;
};
module.exports = {
  create,
};