/*!
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//  Copyright (C) 2026 jeffy-g <hirotom1107@gmail.com>
//  Released under the MIT license
//  https://opensource.org/licenses/mit-license.php
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/
/**
 * @file progress-light.d.ts
 */
export type ProgressFormatOptions = {
    fmt: string;
    payload?: Record<string, string>;
};
export type TProgressLight = {
    updateOptions(newFrames?: string[], newOpt?: ProgressFormatOptions): void;
    deadline(): void;
    newLine(): void;
    setFPS(fps: number): void;
    renderSync(): void;
    run(): void;
    stop(): void;
    isRunning(): boolean;
};
/**
 * @param {number} [fps]
 * @param {() => string} [messageEmitter]
 */
export function create(fps?: number, messageEmitter?: () => string): TProgressLight;