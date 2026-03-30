![GitHub](https://img.shields.io/github/license/jeffy-g/unzip?style=flat)
![NPM Version](https://img.shields.io/npm/v/%40jeffy-g%2Funzip)
![npm](https://img.shields.io/npm/dm/@jeffy-g/unzip.svg?style=plastic)

# @jeffy-g/unzip

Streaming ZIP extraction helper and CLI powered by `fflate`.

Default extraction uses a streaming path, so large ZIP files do not need to be expanded in memory first. The package also ships with a small CLI progress renderer via `progress-light.js`.

## Features

- Stream-first extraction for lower memory usage
- Legacy memory mode for compatibility
- CLI with verbose logging or single-line progress output
- Callback-based API for entry-level progress reporting
- CommonJS package with bundled type definitions

## Install

```bash
npm i @jeffy-g/unzip
```

If you want to use the CLI globally:

```bash
npm i -g @jeffy-g/unzip
```

## CLI

The command name is `ffunzip`.

```bash
ffunzip [-v] [-p|-progress] [-d <dir>] [-m|-mode <stream|memory>] <zip-file> [more.zip ...]
```

### Options

| Option | Description |
| --- | --- |
| `-d <dir>` | Extraction target directory. Default: `./output` |
| `-v` | Print verbose entry logs |
| `-p`, `-progress` | Show the bundled single-line progress renderer. Implies verbose logging |
| `-m`, `-mode <stream\|memory>` | Extraction mode. Default: `stream` |
| `-h`, `-help` | Print help |

### Notes

- Long options use a single dash because the CLI is parsed by `tin-args`
- `stream` is the default and recommended mode
- `memory` uses the previous all-at-once extraction path

### Examples

```bash
ffunzip archive.zip
ffunzip -d ./output bundle.zip
ffunzip -p -mode memory huge.zip
ffunzip -v first.zip second.zip third.zip
```

## API

```js
const unzipWithCallback = require("@jeffy-g/unzip");

/** @type {TUnzipCallback} */
const withCallback = (entry) => {
  if (typeof entry === "string") {
    console.log(`done: ${entry}`);
    return;
  }

  if (entry.state === "info") {
    console.log(`scan [${entry.type === "File" ? "f" : "d"}]: ${entry.path}`.gray(14));
    return;
  }

  if (entry.state === "ignore" || entry.type === "Folder") {
    return;
  }

  const color = entry.state === "pending" ? "cyan" : "green";
  console.log(`${entry.state} - ${
    entry.path[color]
  }${entry.state !== "write" ? `, size: ${entry.size?.toLocaleString().blue}` : ""}`);
};

unzipWithCallback("archive.zip", "./output", withCallback);
// same as unzipWithCallback.stream(...)

unzipWithCallback.memory("archive.zip", "./output", withCallback);
unzipWithCallback.legacy("archive.zip", "./output", withCallback);
```

### Callback states

| State | Meaning |
| --- | --- |
| `info` | Entry discovered while scanning the ZIP |
| `pending` | File extraction is about to start |
| `write` | File extraction finished |
| `ignore` | Directory entry was handled without file output |

### Exported members

- `unzipWithCallback(...)`
- `unzipWithCallback.stream(...)`
- `unzipWithCallback.memory(...)`
- `unzipWithCallback.legacy(...)`
- `unzipWithCallback.version`

## Runtime dependencies

- `fflate`
- `colors.ts`
- `tin-args`

## License

MIT
