/*!
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  Copyright (C) 2024 jeffy-g <hirotom1107@gmail.com>
  Released under the MIT license
  https://opensource.org/licenses/mit-license.php
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/
import * as ff from "fflate";
import "colors.ts";
declare global {
  type UnzipFileFilter = ff.UnzipFileFilter;
  type UnzipFileInfo = ff.UnzipFileInfo;
  /**
   * @param e When one unzip process completes, the zip file path is passed.
   */
  type TUnzipCallback = (e: TSimpleZipEntry | string) => void;
  type TUnzipEntryState = "ignore" | "pending" | "write" | "info";
  type TUnzipEntryType = "File" | "Folder";
  type TUnzipMode = "stream" | "memory";
  type TUnzipHandler = (fileName: string, destDir: string, cb: TUnzipCallback) => void;
  type TSimpleZipEntry = {
    state: TUnzipEntryState;
    type: TUnzipEntryType;
    path: string;
    size?: number;
  };
  type TRawZipEntry = [string, Uint8Array];
  type TForEachCallback = (e: TRawZipEntry) => void;
  interface IForEachCallback {
    (e: TRawZipEntry): void;
  }
  type TUnzipArgs = {
    /**
     * output directory
     */
    d: string;
    /**
     * want verbose log?
     */
    v?: true;
    /**
     * use progress?
     */
    p?: true;
    /**
     * use progress?
     */
    progress?: true;
    /**
     * unzip mode. default is "stream"
     */
    m?: TUnzipMode;
    /**
     * unzip mode. default is "stream"
     */
    mode?: TUnzipMode;
    /**
     * print help
     */
    h?: true;
    /**
     * print help
     */
    help?: true;
  };
}
/**
 * @param {string} fileName zip file path
 * @param {string} destDir output directory path
 * @param {TUnzipCallback} cb
 */
declare function unzipWithCallback(fileName: string, destDir: string, cb: TUnzipCallback): void;
declare namespace unzipWithCallback {
  export const version: string;
  export const stream: TUnzipHandler;
  export const memory: TUnzipHandler;
  export const legacy: TUnzipHandler;
  //! Since it is converted to an esm module by `node`,
  //! `default` becomes a main funciton.
  const _default: typeof unzipWithCallback;
  export { _default as default };
}
export = unzipWithCallback;