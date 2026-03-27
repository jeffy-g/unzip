![GitHub](https://img.shields.io/github/license/jeffy-g/rm-cstyle-cmts?style=flat)

# @jeffy-g/unzip

>use fflate unzip feature

Default extraction now uses a streaming path so large ZIP files do not need to be fully expanded in memory first.  
CLI progress rendering is bundled as `progress-light.js`.

## CLI usage

### command line name - **ffunzip**

  + all zip file extract to `<output directory>`  
    Default mode is `stream`. If you need a detailed log, please specify the `-v` option. If you want a single-line progress spinner, use `-p` or `--progress`.

  ```
  $ ffunzip [-v] [-p|--progress] [-d <output directory>] [-mode stream|memory] <zip file> <zip file> <zip file> ...
  ```

  + NOTE: if `-d` omitted then output directory to `./output`
  + `-p`, `--progress` show the bundled lightweight progress spinner
  + `-mode:memory` uses the previous all-at-once implementation as a legacy sub feature

## API

```js
// DEVNOTE: 2024/01/01 - "colors.ts" available
const unzipWithCallback = require("@jeffy-g/unzip");

/** @type {(path: TSimpleZipEntry) => void} */
const withCallback = e => {
  // means you are scanning for zip entries
  if (e.state === "info") {
    console.log(`zip info [${e.type === "File" ? "f": "d"}]: ${e.path}`.gray);
  } else if (e.type === "File") {
    const state = e.state;
    const color = state === "pending" ? "cyan": "green";
    console.log(`${state} - ${
      e.path[color]}${state !== "write" ? `, size: ${e.size?.toLocaleString().blue}`: ""
    }`);
  }
  //  else if (e.state === "ignore" || e.type === "Folder") {
  //    // do nothing
  // }
};

unzipWithCallback("[zipPath]", "[output directory]", withCallback);
// same as unzipWithCallback.stream(...)

// legacy all-at-once path
unzipWithCallback.memory("[zipPath]", "[output directory]", withCallback);
// alias
unzipWithCallback.legacy("[zipPath]", "[output directory]", withCallback);
```

## Runtime dependencies

This package now keeps runtime dependencies focused on unzip behavior:

+ `fflate`
+ `colors.ts`
+ `tin-args`


> ## Authors

-   **jeffy-g** - [jeffy-g](https://github.com/jeffy-g)

> ## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
