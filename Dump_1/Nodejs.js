
Node js
client server architecture, CLI vs gunzip, 
echo, pwd, whoami differences and commands list
navigation file system
listing directory contents and createTracing, copying, moving, deletingfiles, and directoris, viewing and editing files by commands
all using CaretPosition, nano, vim,
configuring terminal using .bashrc file


====================================================================
Topic 1: Client–Server Architecture & CLI vs GUI
====================================================================

ASCII flow (request/response):

          +-----------+    HTTP Request     +------------+
          |           | ------------------> |            |
          |  CLIENT   |                     |   SERVER   |
          | (Browser/ | <------------------ | (Node.js + |
          |  Mobile)  |    HTTP Response    |  DB layer) |
          +-----------+                     +------------+
                ^                                 |
                |                                 v
          User actions                  Business logic & storage

- Client packages data (URL, headers, body) → sends over network layer.
- Server (Node.js) uses event loop to parse request, call controllers, talk to DB/cache, compose response.
- Stateless HTTP: every request carries auth context (tokens/cookies).
- Scaling options: horizontal (more servers behind load balancer) vs vertical (bigger machine).

CLI vs GUI quick compare:

| Feature          | CLI (Command Line)                    | GUI (Graphical)                       |
|------------------|---------------------------------------|---------------------------------------|
| Speed            | Very fast for repetitive automation   | Slower due to pointer interactions    |
| Resource usage   | Low memory & CPU                      | Higher usage                          |
| Automation       | Shell scripts, cron, pipelines        | Limited scripting                     |
| Learning curve   | Steeper                               | Beginner friendly                     |
| Remote use       | SSH friendly                          | Needs remote desktop/tunneling        |

====================================================================
Topic 2: Essential Shell Navigation & Editing
====================================================================

Command cheat sheet:

| Command | Description                         | Example                          |
|---------|-------------------------------------|----------------------------------|
| `echo`  | Print text to stdout                | `echo "Hello Node"`              |
| `pwd`   | Show present working directory      | `/Users/nikita/projects`         |
| `whoami`| Display current OS user             | `nikita`                         |
| `ls`    | List directory contents             | `ls -la` (with hidden + metadata)|
| `cd`    | Change directory                    | `cd src/utils`                   |
| `mkdir` | Create directory                    | `mkdir logs`                     |
| `cp`    | Copy files / dirs                   | `cp .env.example .env`           |
| `mv`    | Move or rename                      | `mv temp.js utils/helpers.js`    |
| `rm`    | Remove files / dirs                 | `rm -rf dist`                    |
| `cat`   | Quick view file contents            | `cat package.json`               |
| `nano`  | Terminal editor (easy)              | `nano server.js`                 |
| `vim`   | Modal editor (powerful)             | `vim app.js`                     |

Flow for navigating file system:

[Start]-`pwd`->/home/user
   |
   +--`ls`--> see folders
           |
           +--`cd project`--> inside project
                           |
                           +--`ls src`--> inspect subdir

Editing options timeline:

`cat` (view only) → `nano` (insert mode) → `vim` (normal/insert/command) for advanced macros.

====================================================================
Topic 3: Customizing Terminal via ~/.bashrc
====================================================================

- `.bashrc` runs for every interactive shell → great for aliases, env vars, prompt tweaks.
- Steps:
  1. `nano ~/.bashrc`
  2. Add aliases / exports
  3. `source ~/.bashrc` to reload current terminal.

Sample snippet:

```
export PS1="[\u@\h \W]\\$ "     # Prompt shows user@host + folder
alias ll='ls -alh'
alias gs='git status'
export NODE_ENV=development
export PATH="$HOME/.npm-global/bin:$PATH"
```

Flow chart for new alias availability:

Edit ~/.bashrc → save → `source ~/.bashrc` → shell re-reads file → alias available.

Gotchas:
- macOS with zsh uses `~/.zshrc`.
- Keep secrets out of `.bashrc`; use `.bash_profile` for login shells if needed.

OS basics -> cpuUsage, processor, core, OS, kernel, process, thread, concurrency, aprallelism, process without using thread, worker threads in deep, environment variables., executable files , file Permissions, managing permission , , methods and properties of process, 

### OS Basics Deep Dive

#### CPU Usage (`process.cpuUsage`)
- Returns microseconds spent in user and system space since process start.
- Call twice and subtract to profile a code section.
- Example:
```javascript
const start = process.cpuUsage();
heavyWork();
const diff = process.cpuUsage(start);
console.log(`User ${diff.user/1000}ms System ${diff.system/1000}ms`);
```

#### Processor, Core, Thread
```
┌───────────────┐
│  CPU Package  │
│ ┌─Core 1────┐ │
│ │ Thread A  │ │
│ │ Thread B  │ │  (SMT/Hyper-Threading)
│ └───────────┘ │
│ ┌─Core 2────┐ │
│ │ Thread A  │ │
│ │ Thread B  │ │
│ └───────────┘ │
└───────────────┘
```
- Node’s JS executes on a single main thread, but libuv thread-pool & worker threads can use other cores for parallel work.

#### OS vs Kernel vs Process
- **OS** = Kernel + userland tools.
- **Kernel** manages scheduling, memory, syscalls.
- **Process** = running program with isolated address space.
- `Process → Syscall → Kernel → Hardware` pipeline controls I/O.

#### Concurrency & Parallelism
```
Single core concurrency:
Time →
[Task A][Task B][Task A][Task B]  (context switches)

Multi-core parallelism:
Core1: [Task A──────────]
Core2: [Task B──────────]
```
- Node achieves concurrency via event loop; parallelism via worker threads, cluster, or multiple processes.

#### Worker Threads Overview
```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  new Worker(__filename, { workerData: { range: 1e8 } })
    .on('message', msg => console.log('Result', msg));
} else {
  let sum = 0;
  for (let i = 0; i < workerData.range; i++) sum += i;
  parentPort.postMessage(sum);
}
```
- Use for CPU-intensive tasks (hashing, image processing).
- Share state via `SharedArrayBuffer` or `Atomics`.
- Avoid spawning more workers than CPU cores.

#### Processes without Threads
- `child_process.spawn/fork` starts new processes with independent event loops.
- Use message channels (`process.send`) or IPC to communicate.
- Good for isolation or executing other binaries (FFmpeg, Python).

#### Environment Variables
- Set in shell: `export DB_URL=...`.
- Load via `dotenv` in Node.
- Always prefix secrets with `process.env`.
```javascript
require('dotenv').config();
const db = process.env.DB_URL;
```

#### Executable Scripts & Permissions
- Add shebang: `#!/usr/bin/env node`.
- Make executable: `chmod +x cli.js`.
- Run: `./cli.js` (UNIX) or `node cli.js` (cross-platform).

#### File Permissions & Ownership
```
-rwxr-xr--  user/group/others
 r=4, w=2, x=1
```
- Change permissions: `chmod 755 app.sh`.
- Change owner: `sudo chown deploy:deploy app.sh`.
- Default creation mask via `umask`.

#### Managing Permissions Diagram
```
[User Intent] → chmod/chown → Kernel checks → FS metadata updates
                                 │
                                 ▼
                         Future access checks
```

#### Process Object Essentials
- `process.pid`, `process.ppid`, `process.title`.
- `process.cwd()`, `process.chdir(path)`.
- `process.memoryUsage()`, `process.resourceUsage()`.
- `process.uptime()`, `process.hrtime.bigint()` for profiling.
- Event hooks: `SIGINT`, `SIGTERM`, `uncaughtException`, `unhandledRejection`.

#### Graceful Shutdown Flow
```
SIGINT/SIGTERM
    ↓
log intent → stop accepting traffic
    ↓
close DB connections / flush queues
    ↓
process.exit(0)
```

#### Monitoring OS-Level Metrics
- Use `os` module: `os.cpus()`, `os.totalmem()`, `os.freemem()`, `os.loadavg()`.
- Combine with `process` metrics to feed Prometheus/Grafana dashboards.


fundamentals of node js -
js module, moduleobject, module wrapper function, ES6 vs ES7, access filename and dirname in ES6, module systems and types, common jsvc es6, type of builtinModules, NPM builtinModules, , publishing package on NPM, package.json in depth, shebang, 
library vs cli packages , local vs global packages, NPX works?, NPX, FS module, fileoperations all

### Node.js Fundamentals Deep Dive

#### Module Systems Overview
```
┌─────────────┐
│ CommonJS    │  require / module.exports
├─────────────┤
│ ES Modules  │  import / export
├─────────────┤
│ UMD         │  hybrid (browser + Node)
└─────────────┘
```
- Node supports CJS by default; ESM via `.mjs` or `"type":"module"`.
- Interop: `createRequire` for requiring from ES modules; dynamic `import()` inside CJS.

#### Module Object & Wrapper
```javascript
(function (exports, require, module, __filename, __dirname) {
  // Module code
});
```
- `module.exports` defines public API.
- `require.cache` stores loaded modules; experimental `module.createRequire`.
- Circular deps: Node loads partially evaluated exports.

#### ES6 vs ES7 Key Differences
- ES6 (2015): `let/const`, arrow functions, classes, template literals, destructuring, default params, `Promise`, `Map/Set`, modules.
- ES7 (2016): `Array.prototype.includes`, `**` exponentiation.
- Later: ES8 async/await, ES9 rest/spread for objects, etc.
- Node release matrix: ensure target runtime supports features (use `core-js`/Babel for older environments).

#### Accessing `__filename`/`__dirname` in ES Modules
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

#### Built-in Module Taxonomy
- **System**: `fs`, `path`, `os`, `process`, `child_process`, `worker_threads`.
- **Network**: `http`, `https`, `net`, `tls`, `dgram`, `dns`, `http2`.
- **Data**: `buffer`, `stream`, `zlib`, `crypto`, `perf_hooks`.
- **Utilities**: `events`, `util`, `assert`, `timers`, `readline`.
- **Diagnostics**: `inspector`, `v8`, `trace_events`.
List via `require('module').builtinModules`.

#### NPM Workflow & Package Publishing
1. Init: `npm init` or `pnpm init`.
2. Semantic versioning (MAJOR.MINOR.PATCH).
3. Scripts lifecycle: `preinstall`, `postinstall`, custom `npm run`.
4. Publishing steps:
   - Ensure unique package name.
   - `npm login`.
   - Create `.npmignore`/`files` whitelist.
   - `npm publish --access public`.
   - For updates: `npm version patch|minor|major` then publish.
5. Scoped packages: `@org/pkg`.
6. Depracating: `npm deprecate pkg@"<1.0" "message"`.

#### package.json Anatomy
```json
{
  "name": "@scope/api",
  "version": "1.2.0",
  "description": "REST API",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc -p tsconfig.json",
    "lint": "eslint .",
    "test": "vitest",
    "prepare": "husky install"
  },
  "dependencies": {
    "express": "^4.19.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "engines": {
    "node": ">=18",
    "npm": ">=9"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/repo.git"
  },
  "keywords": ["node", "api"]
}
```
- `exports` field controls subpath exports.
- `type` toggles CJS vs ESM default.
- `bin` for CLI commands.
- `workspaces` for monorepos.

#### Shebang & CLI Scripting
```javascript
#!/usr/bin/env node
import fs from 'fs';
// CLI logic...
```
- Provide `bin` mapping in package.json.
- Handle CLI args via `process.argv`, `yargs`, or `commander`.
- Add help/usage output.

#### Library vs CLI Package Design
- Library: focus on exported functions/classes, semantic versioning, tree-shaking support, TypeScript types.
- CLI: handle stdin/stdout, interactive prompts, exit codes, cross-platform paths, update notifier.
- Provide both by exposing library API and `bin` entry.

#### Local vs Global Dependencies
- Local (default): `node_modules` per project; referenced via code.
- Global (`npm i -g`): exposes binaries on PATH, not bundled with project.
- Use `npx` to avoid global install.
- Monorepo strategy: hoist shared deps with npm workspaces/pnpm/yarn.

#### NPX Internals
```
npx cmd → check local node_modules/.bin
       → fallback to PATH/global
       → if missing, download temp package cache, execute, cache cleanup
```
- Supports version pinning `npx eslint@8 .`.
- In Node 18+, `corepack` handles `pnpm dlx`, `yarn dlx`.

#### FS Module & File Ops
- Sync/Async/Promise variants (`fs.readFile`, `fs.readFileSync`, `fs.promises.readFile`).
- Streaming APIs for large files.
- Watchers: `fs.watch`, `fs.watchFile`, `chokidar` for cross-platform.
- Permissions & flags:
  - `r`, `r+`, `w`, `w+`, `a`, `a+`.
  - `fs.open(path, flags, mode)`.
- Atomic writes: write temp file then rename.
- Directory ops: `fs.mkdir({ recursive: true })`, `fs.rm`.
- File descriptors: handle close errors, `try/finally`.

#### File Operation Cheat Sheet
```javascript
import { promises as fs } from 'fs';

await fs.writeFile('log.txt', 'hello', { flag: 'a' }); // append
const stats = await fs.stat('log.txt'); // size, mtime
await fs.copyFile('src.txt', 'dst.txt');
await fs.rename('old', 'new');
const entries = await fs.readdir('.', { withFileTypes: true });
```

#### Common Built-in Utility Patterns
- `util.promisify` for callback APIs.
- `util.types.isProxy` etc for runtime checks.
- `events.once` for single event resolution.
- `perf_hooks.performance.now()` for timing.

#### Module Resolution Algorithm (CJS)
1. If starts with `./` or `../` resolve relative path.
2. If pathless, search node_modules ascending directories.
3. Evaluate `package.json` `main` field; fallback to `index.js`.
4. Cache loaded module; subsequent requires reuse instance.
5. `.json` automatically parsed; `.node` native addons.

#### ESM Resolution Nuances
- Must use explicit extensions (`import './file.js'`).
- Package `exports` field controls entry points.
- Mixed modules require dual package pattern.
- Top-level await allowed only in ES modules.

#### Common Pitfalls & Solutions
- **Circular import**: restructure to export functions rather than values.
- **Different ESM/CJS**: publish dual builds via `exports` map.
- **Large node_modules**: use `.npmrc` `save-exact`, `npm dedupe`.
- **Transitive peer deps**: document installation requirements.

#### Recommended Tooling Stack
- Linters: ESLint + TypeScript.
- Test: Jest/Vitest + Supertest for HTTP.
- Bundlers: esbuild/tsup for libraries, webpack/vite for frontend.
- Monorepo: Turborepo/Nx.

#### Node Release Strategy & LTS
```
Odd versions → Current (6 months)
Even versions → LTS (active 18 months + maintenance 12 months)
Use LTS for production deployments.
```

#### Diagram: Package Lifecycle
```
Code → package.json/scripts → npm publish → npm registry → npm install → node_modules/.bin symlinks
```




Data representation in computing -> ontouchcancel, hexadeimal, binary, character sets vs character encodings, UTF-8, UTF-16, UTF-32, ASCII, ISO-8859-1, EBCDIC, Unicode, BOM, endianness, 
,unicode planes, BOM byte order markAsUncloneable, 

### Data Representation in Computing (Deep Dive)

#### Why It Matters
- Controls how numbers, text, and media are stored/transmitted.
- Impacts interoperability, storage size, network protocols, security.
- Essential for parsing binary formats, APIs, file encodings.

#### Number Systems
| Base | Digits         | Example    | Decimal |
|------|----------------|-----------|---------|
| 2    | 0-1            | 1011      | 11      |
| 8    | 0-7            | 057       | 47      |
| 10   | 0-9            | 123       | 123     |
| 16   | 0-9,A-F        | 0x2F      | 47      |

```js
const n = 255;
n.toString(2);    // '11111111'
n.toString(16);   // 'ff'
parseInt('ff',16);// 255
```

#### Floating Point (IEEE 754)
```
32-bit: sign(1) | exponent(8) | mantissa(23)
value = (-1)^sign × 1.mantissa × 2^(exp-127)
```
- Precision errors (0.1 + 0.2 ≠ 0.3); compare with tolerance.
- Use BigInt/decimal libs for money/precision tasks.

#### Character Sets vs Encodings
- Character set: repertoire of symbols (Unicode, ASCII).
- Encoding: algorithm to map code points → bytes (UTF-8/16/32, ISO-8859-1).
- Must know both to interpret raw bytes correctly.

#### ASCII, ISO-8859-1, EBCDIC
```
ASCII (7-bit): 0–127, English letters/control chars.
ISO-8859-1 (8-bit): adds Western European glyphs.
EBCDIC (8-bit): IBM mainframes, different ordering.
```

#### Unicode & Code Points
- Universal character set; notation `U+XXXX`.
- Planes:
  - Plane 0 BMP (U+0000–U+FFFF)
  - Plane 1 SMP (U+10000–U+1FFFF, emoji/symbols)
  - Plane 2 SIP (CJK extensions)
  - Planes 3–13 reserved
  - Plane 14 special purpose
  - Planes 15–16 private use
- UTF-16 uses surrogate pairs for code points > U+FFFF.

#### UTF-8 Encoding
```
U+0000–007F:    0xxxxxxx
U+0080–07FF:    110xxxxx 10xxxxxx
U+0800–FFFF:    1110xxxx 10xxxxxx 10xxxxxx
U+10000–10FFFF: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
```
- Example: 😀 (U+1F600) → `F0 9F 98 80`.
- ASCII compatible, self-synchronizing.

#### UTF-16 & UTF-32
- UTF-16: 2 bytes for BMP; surrogate pairs for supplementary planes.
- UTF-32: fixed 4 bytes per char, simpler but larger footprint.

#### BOM (Byte Order Mark)
| Encoding  | Bytes        |
|-----------|--------------|
| UTF-8     | EF BB BF     |
| UTF-16 BE | FE FF        |
| UTF-16 LE | FF FE        |
| UTF-32 BE | 00 00 FE FF  |
| UTF-32 LE | FF FE 00 00  |
- Indicates encoding + endianness; optional for UTF-8.

#### Endianness
```
Value 0x12345678
Big Endian:    12 34 56 78
Little Endian: 78 56 34 12
```
- Network byte order = big endian.
- Use Buffer/DataView methods to read/write with explicit endianness.

#### Byte Order Mark as Uncloneable
- Some DOM clone operations treat BOM as metadata; remove BOM when duplicating template text nodes to avoid errors.

#### `ontouchcancel`
- Fired when touch gesture interrupted (incoming call, UI change).
- When logging binary gesture data, ensure consistent encoding to replay accurately across devices.

#### Practical Tips
- Always supply encoding when reading/writing text: `fs.readFile('file','utf8')`.
- Validate incoming text to prevent mojibake.
- Use `TextEncoder/TextDecoder` for conversions.
- Document protocol field sizes, encodings, and byte order.
- Inspect bytes via `xxd`/`hexdump`; log `Buffer` contents in Node.
- Use `iconv-lite` or ICU for legacy encodings.

#### Encoding Pipeline Diagram
```
Text → Unicode code points → Encoding → Bytes → Transport/Storage
Bytes → Decoding → Code points → Rendered glyphs
```

#### Debug Snippets
```js
const buf = Buffer.from('€', 'utf8');
console.log(buf);             // <Buffer e2 82 ac>
console.log(buf.toString('utf16le')); // incorrect decode demo

const ab = new ArrayBuffer(4);
const view = new DataView(ab);
view.setUint32(0, 0x12345678, true); // little endian
console.log(view.getUint32(0, false)); // reinterpret big endian
```


Buffers -> Arraybuffers and handling, signed unsigned getRandomValues, reading and writing to array buffers, multibyte data, type arrays, transfering array buffer data from memory to disk and networkInterfaces,  buffer in nodejs
alloc vs allosUnsafe
, buffer Pool, buffer methos and properties. uses of buffers and limitations

### Buffers, ArrayBuffers, Typed Arrays (Extreme Detail)

#### 1. Conceptual Map
```
JS String (UTF-16) → encode → Buffer/Uint8Array → persist/send
Buffer (Node) ≈ Uint8Array view + extra helpers
ArrayBuffer = raw memory block (browser & Node)
TypedArray/DataView = typed views on ArrayBuffer
```

#### 2. Creating Buffers
```js
Buffer.alloc(size, fill = 0, encoding = 'utf8');        // zero-filled
Buffer.allocUnsafe(size);                               // fast, garbage data
Buffer.allocUnsafeSlow(size);                           // standalone, no pool
Buffer.from(array | string | ArrayBuffer, encoding);    // copy from source
```
- `allocUnsafe` is ~2x faster but must be fully overwritten before use.
- `Buffer.from(arrayBuffer)` shares memory; mutations visible both ways.

#### 3. Buffer Pool & Memory
- Default `Buffer.poolSize = 8192`.
- Requests < 4KB carve slices from pool (slab allocation) to reduce syscalls.
- Pool refilled when depleted; GC frees slabs when no slices reference them.
- `alloc` bypasses pool to zero memory (security).

#### 4. Methods Cheat Sheet
```
buf.length
buf[index]                      // get/set byte (0–255)
buf.toString(encoding, start, end)
buf.equals(otherBuf)
buf.compare(otherBuf)
buf.copy(target, targetStart, sourceStart, sourceEnd)
buf.slice(start, end)           // zero-copy view
buf.subarray(start, end)        // alias
buf.write(string, offset, length, encoding)
buf.fill(value, start, end, encoding)
buf.includes(value, offset, encoding)
buf.indexOf(value, offset, encoding)
buf.swap16/32/64
```

#### 5. Numeric Read/Write (Endianness)
```js
buf.writeUInt8(value, offset);
buf.writeUInt16LE(value, offset);
buf.writeUInt16BE(value, offset);
buf.writeInt32LE(value, offset);
buf.writeFloatBE(value, offset);
buf.writeDoubleLE(value, offset);

buf.readUIntBE(offset, byteLength);
buf.readUIntLE(offset, byteLength);
buf.readIntBE(offset, byteLength);
buf.readDoubleLE(offset);
```
- Use LE vs BE to match protocol specs.
- For unusual sizes (3-byte ints) use `readUIntLE(offset, 3)`.

#### 6. Slicing vs Copying
- `slice` returns new Buffer referencing same memory; changing slice mutates origin.
- Use `Buffer.from(buf)` or `buf.copy` for independent copy.
```js
const original = Buffer.from('abcd');
const view = original.slice(0, 2);
view[0] = 0x78;   // modifies original[0]
```

#### 7. Buffer.concat
```js
Buffer.concat([buf1, buf2, buf3], totalLength);
```
- `totalLength` optional but avoids extra pass.
- Internal copies, so heavy use may be costly; prefer streaming writes.

#### 8. ArrayBuffer & TypedArray
```js
const ab = new ArrayBuffer(16);
const uint8 = new Uint8Array(ab);
const int32 = new Int32Array(ab, 0, 4);  // shares memory
const view = new DataView(ab);
view.setInt32(0, 123456, false);         // BE
```
- Buffer inherits from Uint8Array; `Buffer.from(ab)` uses same memory.
- `SharedArrayBuffer` + Atomics allow thread-safe shared memory.

#### 9. Signed vs Unsigned
- Signed ints use two’s complement: MSB = sign bit.
- Example: `0xFF` read as `UInt8` = 255, `Int8` = -1.
- Choose `writeInt*` vs `writeUInt*` to match data semantics.

#### 10. Cryptographic Randomness
```js
const { randomBytes, randomFillSync } = require('crypto');
const buf = randomBytes(32);                 // Buffer
const arr = new Uint32Array(4);
randomFillSync(arr);                         // typed array
```
- Browser equivalent: `crypto.getRandomValues`.

#### 11. Reading / Writing Multi-byte Records
Example binary header:
```
Offset  Size  Type     Meaning
0       2     uint16   version
2       4     uint32   payloadLength
6       1     uint8    flags
```
```js
const header = Buffer.alloc(7);
header.writeUInt16BE(version, 0);
header.writeUInt32BE(payloadLength, 2);
header.writeUInt8(flags, 6);
```
- To parse: `buffer.readUInt16BE(0)` etc.

#### 12. File I/O Integration
- `fs.read(fd, buffer, offset, length, position, callback)` fills buffer.
- Reuse the same buffer to minimize allocations.
- Streams (`fs.createReadStream`) emit Buffer chunks respecting `highWaterMark`.
- For random access: `fs.open`, `fs.read`, `fs.write`.

#### 13. Network I/O
- `net.Socket` accepts Buffers; writes may be buffered (check return value).
- `socket.on('data', (chunk) => ...)` receives Buffers (not strings unless encoding set).
- UDP: `socket.send(buffer, offset, length, port, host)`.
- HTTP request/response bodies stream as Buffers by default.

#### 14. Buffer vs Stream vs String
|                | Buffer                    | Stream                               | String                              |
|----------------|---------------------------|--------------------------------------|-------------------------------------|
| Size           | Finite chunk in memory    | Potentially unbounded                | Finite (UTF-16 internally)          |
| Encoding       | Raw bytes                 | Raw bytes or object mode             | UTF-16 sequences                    |
| Use Case       | Binary protocols, crypto  | Large file transfer, network piping  | Text processing                     |

#### 15. `alloc` vs `allocUnsafe`
- `alloc` calls `calloc`/memset → zeroed memory.
- `allocUnsafe` just reserves pointer; may contain previous data (security risk).
- Use `allocUnsafe` for hot paths where you immediately overwrite.
- `allocUnsafeSlow` bypasses pooling (useful for long-lived large Buffer to avoid slab retention).

#### 16. Buffer Pool Internals
```
if (size <= poolSize >> 1) {
  if (pool offset + size > poolSize) refill slab
  return pool.slice(offset, offset + size)
} else {
  return createUnsafeBuffer(size)
}
```
- `Buffer.poolSize` adjustable (e.g., `Buffer.poolSize = 1024 * 1024`).
- Be mindful: large pool may hold memory longer if slices linger.

#### 17. Performance Tips
- Avoid repeated `Buffer.concat` in loops → use array + single concat or streams.
- Use typed arrays + `TextEncoder/TextDecoder` when bridging to browser APIs.
- For big data, prefer streaming pipelines with backpressure.
- Benchmark: `node --trace_gc` to detect Buffer-induced GC pressure.

#### 18. Buffer & TypedArray Interop Examples
```js
const buf = Buffer.from([0,1,2,3]);
const u16 = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
console.log(u16);  // interprets pairs as 16-bit ints
```
- To detach, copy via `Buffer.from(buf)` or `new Uint8Array(buf)`.

#### 19. SharedArrayBuffer & Atomics (Node >=16)
```js
const shared = new SharedArrayBuffer(4);
const view = new Int32Array(shared);
Atomics.store(view, 0, 42);
Atomics.add(view, 0, 1);
Atomics.wait(view, 0, 43);
```
- Use with worker threads for lock-free communication.

#### 20. Encoding / Decoding Utilities
```js
const { TextEncoder, TextDecoder } = require('util'); // Node >=11
const encoder = new TextEncoder();      // UTF-8
const arr = encoder.encode('hello');    // Uint8Array
const decoder = new TextDecoder('utf-8');
decoder.decode(arr);
```
- `Buffer.from(string, 'utf8')` equivalent but TextEncoder matches browser spec.

#### 21. Buffer.transcode (Node)
```js
const { transcode } = require('buffer');
const source = Buffer.from('ê', 'latin1');
const target = transcode(source, 'latin1', 'utf8');
```
- Powered by ICU; supports limited encodings (utf8/16/32, ucs2, latin1).

#### 22. getRandomValues Equivalent
- Browser: `crypto.getRandomValues(new Uint8Array(16))`.
- Node: `crypto.randomFillSync(new Uint8Array(16))`.

#### 23. Transfer ArrayBuffer to Disk
```js
const { writeFile } = require('fs/promises');
const ab = new Uint8Array([1,2,3]).buffer;
await writeFile('data.bin', new Uint8Array(ab));
```
- Reverse: `const ab = (await readFile('data.bin')).buffer`.

#### 24. Buffer Limitations & Pitfalls
- Max size ~1GB (depends on architecture). Attempting bigger throws `ERR_OUT_OF_RANGE`.
- Memory leak risk: storing Buffers in long-lived caches without eviction.
- `buf.toString()` defaults to utf8; binary data may corrupt when coerced to string.
- Beware mixing `Buffer` and `string` operations; always specify encoding.
- Reusing Buffer for asynchronous operations before completion can corrupt data.
- Slicing beyond bounds throws RangeError (since Node 10).

#### 25. Debugging & Inspection
- `console.log(buf)` prints `<Buffer ...>`.
- `buf.inspect()` returns string; customize by overriding `util.inspect.custom`.
- `hexdump` equivalent: `console.log(buf.toString('hex').match(/.{1,2}/g))`.
- Node inspector → Memory tab → search for `ArrayBuffer`/`Buffer` to track usage.

#### 26. Binary Protocol Example (TLV)
```
Type (1 byte) | Length (2 bytes BE) | Value (Length bytes)
```
```js
function encodeTLV(type, valueBuf) {
  const buf = Buffer.alloc(3 + valueBuf.length);
  buf.writeUInt8(type, 0);
  buf.writeUInt16BE(valueBuf.length, 1);
  valueBuf.copy(buf, 3);
  return buf;
}
```

#### 27. Streams + Buffers
- `Readable` emits Buffer chunks (unless `setEncoding` called).
- `Writable` accepts Buffers or strings; returns `false` when highWaterMark reached.
- `pipeline` handles cleanup when errors occur.
- Combine buffering + streaming: accumulate small packets until full message.

#### 28. Backpressure & Buffering Strategy
```
Producer (fast) → Writable (buffer) → Consumer (slow)
```
- Check `writable.write(buffer)` return value; if false, pause producer until `drain`.
- For custom streams, maintain internal queue of Buffers respecting `highWaterMark`.

#### 29. Use Cases
- Cryptography (hash digest Buffers, key material).
- Compression (gzip/brotli input/output).
- Image/audio processing (pixel PCM data).
- Binary serialization (Protocol Buffers, Cap’n Proto, MessagePack).
- WebSockets & HTTP/2 frame encoding.
- Interfacing with native addons (N-API) requiring raw memory.

#### 30. Example: Sending File via TCP in Chunks
```js
const fs = require('fs');
const net = require('net');

const server = net.createServer((socket) => {
  const stream = fs.createReadStream('big.bin');
  stream.pipe(socket);
});

server.listen(4000);
```
- `pipe` handles Buffer flow + backpressure automatically.

#### 31. Example: Memory-Mapped File (via addon)
- Node core lacks direct mmap; libraries like `mmap-io` expose Buffers referencing memory-mapped regions.
- Example:
```js
const mmap = require('mmap-io');
const buf = mmap.openSync('file.bin', 'r+');
```
- Acts like Buffer but reading/writing hits file on disk via OS page cache.

#### 32. Buffer Serializer Utilities
- Implement `pack`/`unpack` similar to Python `struct`.
```js
function writeUInt24BE(buf, value, offset=0) {
  buf[offset] = value >> 16;
  buf[offset+1] = value >> 8;
  buf[offset+2] = value & 0xff;
}
```
- Use for exotic integer sizes (24-bit length fields, etc.).

#### 33. Buffer.from JSON
- `Buffer.from(JSON.stringify(obj))` stores UTF-8 JSON.
- `buf.toString()` parse back via `JSON.parse`.
- For binary JSON (BSON, CBOR) need dedicated libs.

#### 34. Buffer & WASM
- WASM memory exposes `ArrayBuffer`; use `Buffer.from(wasmMemory.buffer)` to inspect/manipulate memory from Node.
- Keep in mind: Buffer view invalidated if WASM memory grows.

#### 35. Buffer Reuse Pattern
```js
const buf = Buffer.allocUnsafe(64 * 1024);
let bytesRead;
while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, position)) > 0) {
  processChunk(buf.slice(0, bytesRead));
  position += bytesRead;
}
```
- Avoids per-iteration allocation; `slice` ensures only valid data processed.

#### 36. Security Considerations
- Always zero out buffers containing secrets before letting them go out of scope if threat model requires.
```js
buf.fill(0); // before GC
```
- `crypto.scrypt`/`crypto.pbkdf2` operate on Buffers—avoid converting to strings (no base64) for secret data.
- Validate incoming Buffer size to prevent DoS (huge payloads).

#### 37. Buffer Limits & Flags
- CLI options: `--max-old-space-size`, `--max-semi-space-size`.
- `Buffer.kMaxLength` indicates maximum length; `Buffer.constants.MAX_LENGTH`.

#### 38. Interop with Streams (object mode)
- For textual data, set encoding to automatically convert to strings; otherwise Buffer remains default.
```js
readable.setEncoding('utf8'); // 'data' events become strings
```
- For binary, leave encoding unset to receive Buffer chunks.

#### 39. Tools for Binary Workflows
- `protobufjs`, `flatbuffers`, `avsc`.
- `binary-parser` to declaratively describe binary formats.
- `bitwise` libs for bit-level operations.

#### 40. Visualization of Buffer Flow Through Stack
```
[Source] -> Buffer -> Stream pipeline -> Transform (gzip) -> Buffer -> Destination
```




event driven architecture and eventemooters-> async IO in node js, CPU operations vs I?O operations, event driven Arch?, custom eventemmiters?

### Event-Driven Architecture & Event Emitters (Deep Dive)

#### 1. Why Event-Driven?
- Traditional request/response with blocking threads wastes resources during I/O waits.
- Event-driven loops keep single thread busy by registering callbacks that fire when events occur.
- Enables high concurrency with minimal threads, perfect for I/O-heavy Node apps.

#### 2. Event Loop Anatomy
```
┌───────────────┐
│ timers        │  setTimeout / setInterval
├───────────────┤
│ pending I/O   │  some OS callbacks
├───────────────┤
│ idle, prepare │  internal hooks
├───────────────┤
│ poll          │  wait for I/O, execute callbacks
├───────────────┤
│ check         │  setImmediate callbacks
├───────────────┤
│ close callbacks│ sockets/handles cleanup
└───────────────┘
Microtasks (process.nextTick, Promises) run between phases → highest priority.
```

#### 3. Async I/O Flow vs CPU Flow
```
Async I/O:
 JS thread → fs.readFile → libuv thread pool → OS I/O → completion queue → callback executed → loop free meanwhile

CPU-bound:
 JS thread runs heavy loop → event loop blocked → timers/I/O delayed until loop finishes
```
- Mitigation: offload CPU tasks to worker threads or child processes.

#### 4. EventEmitter API
```js
const { EventEmitter } = require('events');
class Bus extends EventEmitter {}
const bus = new Bus();

bus.on('data', (payload) => console.log('data', payload));
bus.emit('data', { id: 1 });
```
- `.on` / `.addListener`: register.
- `.once`: auto-remove after first call.
- `.off` / `.removeListener`.
- `.emit`: synchronous invocation (listeners run immediately).
- `.listeners(event)` / `.listenerCount(event)` diagnostics.
- `bus.setMaxListeners(n)` to avoid leak warnings (default 10).

#### 5. Error Events
- Convention: emit `error` event when something fails.
- If no `error` listener attached, Node throws and process crashes.
```js
bus.on('error', (err) => console.error('Handled', err));
```

#### 6. Custom Event Emitters
```js
class OrderService extends EventEmitter {
  place(order) {
    this.emit('order.created', order);
  }
}

const service = new OrderService();
service.on('order.created', (order) => sendEmail(order));
```
- Use namespaced events (`order.created`, `order.cancelled`) for clarity.

#### 7. Async Listener Patterns
- EventEmitter callbacks run synchronously; for async tasks, wrap in `setImmediate` or `queueMicrotask` to avoid blocking other listeners.
```js
bus.on('job', async (job) => {
  try { await processJob(job); }
  catch (err) { bus.emit('error', err); }
});
```

#### 8. Event-Driven Architecture Flow
```
HTTP Request → Controller → Emit Domain Event
      │
      ├──> Persistence
      ├──> Notification
      ├──> Analytics
      └──> Cache Invalidation
```
- Loose coupling: new subscribers can be added without modifying publishers.
- Cross-process: propagate events via Redis pub/sub, RabbitMQ, Kafka.

#### 9. Event Loop Diagnostics
- `process.nextTick` vs `setImmediate`:
  - `process.nextTick`: microtask, executes before I/O; overuse can starve loop.
  - `setImmediate`: runs in check phase (after poll).
- `perf_hooks.monitorEventLoopDelay()` to measure lag.
- `async_hooks` for tracing async resources.

#### 10. CPU vs I/O Benchmarks
```js
// CPU bound
function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }
fib(45); // blocks loop seconds

// I/O bound
http.get('https://example.com', res => {
  res.on('data', chunk => {});
});
```
- Offload CPU tasks to worker threads (`worker_threads`) or job queues.

#### 11. Custom Event Bus Example
```js
class EventBus {
  constructor() { this.handlers = new Map(); }
  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }
  emit(event, payload) {
    (this.handlers.get(event) || []).forEach((handler) => handler(payload));
  }
}
```
- Lightweight alternative when EventEmitter features not needed.

#### 12. Event Loop & Microtasks Sequence Example
```js
console.log('start');
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
console.log('end');
// Order: start, end, nextTick, promise, timeout/immediate (order of last two can vary)
```

#### 13. Combining Events with Promises
```js
const { once } = require('events');
const [message] = await once(bus, 'message');
```
- Useful for awaiting single event (e.g., waiting for server `'listening'`).

#### 14. Backpressure & Events
- EventEmitter emits synchronously; heavy listener slows emitter.
- For rapid events, queue tasks:
```js
bus.on('data', (payload) => {
  if (!taskQueue.push(payload)) bus.emit('overflow');
});
```
- Or hand off to `setImmediate` to yield.

#### 15. Real-World Patterns
- Logging: emit log events, handle writing/rotation asynchronously.
- CQRS/DDD: domain events raised from aggregates, handled by subscribers.
- UI (Electron): main <-> renderer communication via events.
- Cron/task scheduler: emit `task:run` when timer fires.

#### 16. Event Loop Blocking Detection
```js
const start = Date.now();
setInterval(() => {
  const latency = Date.now() - start - 100;
  if (latency > 50) console.warn('Loop blocked:', latency);
  start = Date.now();
}, 100).unref();
```

#### 17. Custom Async Queue Example
```js
class AsyncQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
  }
  push(job) {
    this.queue.push(job);
    this.emit('enqueue', job);
    this._process();
  }
  async _process() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length) {
      const job = this.queue.shift();
      try {
        await job();
        this.emit('success', job);
      } catch (err) {
        this.emit('error', err, job);
      }
    }
    this.processing = false;
    this.emit('drain');
  }
}
```

#### 18. Comparison Table
| Approach              | Use Case                           | Notes                                |
|-----------------------|------------------------------------|--------------------------------------|
| Polling               | Simple status checks               | Wastes CPU/network                   |
| Event-driven          | I/O heavy, reactive apps           | Needs event bus design               |
| Message queues        | Cross-service events               | Durable, asynchronous                |

#### 19. Tips
- Document events + payload types to avoid confusion.
- Remove listeners (`emitter.off`) when objects destroyed to prevent leaks.
- Use `emitter.once` for lifecycle events (e.g., `server.once('close', ...)`).
- For multi-process scaling, pair event emitters with Redis pub/sub or Kafka topics.



from pathlib import Path

path = Path("Nodejs.js")
data = path.read_text()
marker = ("streams in node js -> types of streams, readble, diff states of readable streams,  "
          "writable, backpressure , internal buffer of writable, closing writable, states in "
          "wriytbel stream, piping streams, piping using piplines, duplex, transfomr, "
          "passthrough, data streams,, piping and redirection of dtaa streams, opening files in "
          "diff REPL_MODE_SLOPPY, writing to file with file descriptor, handling files using "
          "promises, how browsers use strams -> streams in js")
blank = "\r\n" * 5
old = marker + blank

insert_lines = [
    "### Streams in Node.js (Ultra Detailed)",
    "",
    "#### 1. Why Streams?",
    "- Process massive data incrementally; avoid loading full payload.",
    "- Reduce memory footprint, enable pipelining/compression/encryption on the fly.",
    "- Built atop EventEmitter; integrates with backpressure + Buffer APIs.",
    "",
    "#### 2. Stream Taxonomy",
    "| Type | Direction | Examples |",
    "|------|-----------|----------|",
    "| Readable | source | fs.createReadStream, process.stdin, HTTP request |",
    "| Writable | sink | fs.createWriteStream, process.stdout, HTTP response |",
    "| Duplex | both | net.Socket, tls.TLSSocket |",
    "| Transform | duplex + transform | zlib gzip/brotli, crypto cipher, CSV parser |",
    "| PassThrough | identity | logging / tap for metrics |",
    "| Object Mode | JS objects | set objectMode: true |",
    "",
    "#### 3. Readable States",
    "Paused ↔ Flowing (toggle via pause/resume, pipe, readable event).",
    "",
    "#### 4. Creating Readables",
    "```js",
    "const { Readable } = require('stream');",
    "const fromArray = Readable.from(['a', 'b']);",
    "class Counter extends Readable {",
    "  constructor(max) {",
    "    super();",
    "    this.max = max;",
    "    this.current = 0;",
    "  }",
    "  _read() {",
    "    this.current += 1;",
    "    if (this.current > this.max) this.push(null);",
    "    else this.push(String(this.current));",
    "  }",
    "}",
    "```",
    "",
    "#### 5. Writable Internals & Backpressure",
    "- `highWaterMark` controls internal buffer size (defaults: 16 KB, or 16 objects in object mode).",
    "- `write(chunk)` returns false when buffer full ⇒ wait for `drain` before resuming.",
    "- `end(chunk?)` flushes & emits `finish`; `destroy(err?)` aborts.",
    "```js",
    "if (!writable.write(chunk)) readable.pause();",
    "writable.once('drain', () => readable.resume());",
    "```",
    "",
    "#### 6. `pipe()` and `pipeline()`",
    "```js",
    "fs.createReadStream('input.txt')",
    "  .pipe(zlib.createGzip())",
    "  .pipe(fs.createWriteStream('input.txt.gz'));",
    "```",
    "Use `stream.pipeline` / `stream.promises.pipeline` for automatic error propagation + cleanup.",
    "",
    "#### 7. Transform & Duplex Examples",
    "```js",
    "const { Transform, Duplex } = require('stream');",
    "const upper = new Transform({",
    "  transform(chunk, enc, cb) {",
    "    cb(null, chunk.toString().toUpperCase());",
    "  }",
    "});",
    "class Echo extends Duplex {",
    "  _write(chunk, enc, cb) { this.push(chunk); cb(); }",
    "  _read() {}",
    "}",
    "```",
    "",
    "#### 8. PassThrough Taps",
    "```js",
    "const { PassThrough } = require('stream');",
    "const tap = new PassThrough();",
    "tap.on('data', (chunk) => console.log('len', chunk.length));",
    "source.pipe(tap).pipe(destination);",
    "```",
    "",
    "#### 9. Async Iteration",
    "```js",
    "for await (const chunk of fs.createReadStream('log.txt')) {",
    "  console.log('chunk', chunk.length);",
    "}",
    "```",
    "",
    "#### 10. File Descriptors & Promises",
    "Use `fs.promises.open` + `read` to manage offsets manually when streaming custom layouts.",
    "",
    "#### 11. Browser ↔ Node Streams",
    "Node 18+ provides `Readable.fromWeb` / `Writable.toWeb` to bridge Fetch streams; browsers use `desiredSize` for backpressure.",
    "",
    "#### 12. Error/Close Lifecycle",
    "- Always listen for `error`; otherwise uncaught errors crash process.",
    "- `stream.finished(stream, cb)` (or promise variant) notifies completion or failure.",
    "- `push(null)` signals EOF; `destroy(err)` aborts immediately.",
    "",
    "#### 13. Object Mode & Rate Limiting",
    "Streams can operate in object mode; compose transforms to implement token-bucket throttling.",
    "",
    "#### 14. Practical Pipelines",
    "- File upload (req.pipe(writeStream)).",
    "- HTTP proxy (req → proxyReq, proxyRes → res).",
    "- CSV → JSON pipelines with `csv-parser` + transform + NDJSON writer.",
    "- Compression + encryption chains.",
    "",
    "#### 15. Debugging Tips",
    "- `NODE_DEBUG=stream` to log internals.",
    "- Inspect `readable.readableLength`, `writable.writableLength`.",
    "- Insert `PassThrough` taps to monitor throughput.",
]

insert = "\r\n".join(insert_lines)
new = marker + "\r\n\r\n" + insert + "\r\n\r\n" + blank

if old not in data:
    raise SystemExit("marker block not found")

path.write_text(data.replace(old, new, 1))


streams in node js -> types of streams, readble, diff states of readable streams,  writable, backpressure , internal buffer of writable, closing writable, states in wriytbel stream, piping streams, piping using piplines, duplex, transfomr, passthrough, data streams,, piping and redirection of dtaa streams, opening files in diff REPL_MODE_SLOPPY, writing to file with file descriptor, handling files using promises, how browsers use strams -> streams in js

### Streams in Node.js (Ultra Detailed)

#### 1. Why Streams?
- Process terabytes of data incrementally; avoid loading everything into memory.
- Lower latency and memory footprint; perfect for piping compression/encryption/parsing stages.
- Built on EventEmitter; integrates with Buffer + automatic backpressure.

#### 2. Stream Types
| Type | Direction | Examples |
|------|-----------|----------|
| Readable | source | `fs.createReadStream`, `process.stdin`, HTTP request body |
| Writable | sink | `fs.createWriteStream`, `process.stdout`, HTTP response |
| Duplex | both | `net.Socket`, `tls.TLSSocket`, WebSocket |
| Transform | duplex + transform | gzip/brotli, crypto cipher, CSV parser |
| PassThrough | identity | logging/metrics tap |
| Object Mode | JS objects | `objectMode: true` streams |

#### 3. Readable Stream States
Paused ↔ Flowing  
- Paused (default): pull data manually via `stream.read()` or `readable` event.  
- Flowing: `data` events fire automatically (`.on('data')`, `.pipe()`, `.resume()`).  
- `pause()` returns to paused; removing `data` listener also pauses.

#### 4. Creating Readables
```js
const { Readable } = require('stream');
const fromArray = Readable.from(['foo', 'bar']);

class Counter extends Readable {
  constructor(max) {
    super();
    this.max = max;
    this.current = 0;
  }
  _read() {
    this.current += 1;
    if (this.current > this.max) this.push(null);
    else this.push(`chunk-${this.current}\n`);
  }
}
```

#### 5. Writable Internals & Backpressure
- `highWaterMark` defines buffer size (defaults 16 KB binary / 16 objects).
- `write(chunk)` returns `false` when buffer full → pause producer until `drain`.
- `end(chunk?)` flushes remaining data and emits `finish`.
- `destroy(err?)` aborts immediately (emits `error`, `close`).
```js
if (!writable.write(chunk)) readable.pause();
writable.once('drain', () => readable.resume());
```

#### 6. `pipe()` vs `pipeline()`
```js
fs.createReadStream('input')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('input.gz'));
```
- Prefer `stream.pipeline(src, ...transforms, dest, cb)` or async `stream/promises` version for automatic error propagation + cleanup.

#### 7. Transform & Duplex Examples
```js
const { Transform, Duplex } = require('stream');
const upper = new Transform({
  transform(chunk, enc, cb) {
    cb(null, chunk.toString().toUpperCase());
  }
});
class Echo extends Duplex {
  _write(chunk, enc, cb) { this.push(chunk); cb(); }
  _read() {}
}
```

#### 8. PassThrough Tap
```js
const { PassThrough } = require('stream');
const tap = new PassThrough();
tap.on('data', (chunk) => console.log('len', chunk.length));
source.pipe(tap).pipe(destination);
```

#### 9. Async Iteration
```js
for await (const chunk of fs.createReadStream('log.txt', { encoding: 'utf8' })) {
  console.log(chunk.length);
}
```

#### 10. File Descriptors & Promises
`fs.promises.open` + `read` lets you manage offsets manually when parsing binary protocols; remember to close the descriptor (use `try/finally`).

#### 11. Browser ↔ Node Streams
- Node 18+: `Readable.fromWeb` / `Writable.toWeb` adapt Fetch streams.
- Browser streams expose `ReadableStreamDefaultReader.read()` + `desiredSize` for backpressure.

#### 12. Error & Close Lifecycle
- Always attach `error` listener; missing handler crashes process.
- `stream.finished(stream, cb)` (or promise) notifies when stream completes or fails.
- `push(null)` marks EOF for custom readables; `destroy(err)` aborts; `close` indicates resource freed.

#### 13. Object Mode & Throttling
Streams can operate on JS objects (`objectMode: true`). Implement token-bucket throttling inside a Transform to limit throughput.

#### 14. Practical Pipelines
- File upload: `req.pipe(fs.createWriteStream(dest))`.
- HTTP proxy: `req.pipe(proxyReq); proxyRes.pipe(res);`.
- CSV→NDJSON: `fs.createReadStream().pipe(csv()).pipe(transform).pipe(writeStream)`.
- Compression/encryption: `read → gzip → encrypt → write`.

#### 15. Debugging Tips
- `NODE_DEBUG=stream node app.js` for verbose diagnostics.
- Inspect `readable.readableLength`, `writable.writableLength`.
- Insert `PassThrough` taps for metrics/logging.
- Use `pipeline` to avoid forgotten error handlers and to ensure cleanup.



fundamentals of computer networking -> doesNotMatch, DNS hijacking, DNS working, network networkInterfaces, firewall, OSI module, TCP/IP module, network topologies, SSH, accessing remote terminal, transfering file using ScriptProcessorNode, connecting multiple SSH servers, EC2 instance flow to host our db, 

### Computer Networking Fundamentals (End-to-End Deep Dive)

#### 1. Networking Mindset
- Goal: move bits reliably between endpoints (clients, servers, services).
- Understand layers, addressing, security, and tooling to troubleshoot issues quickly.

#### 2. OSI vs TCP/IP
```
OSI (conceptual)            TCP/IP (practical)
7 Application ┐            ┌─ Application (HTTP, DNS, SSH)
6 Presentation├─ User      │
5 Session     ┘            │
4 Transport (TCP/UDP)      ├─ Transport (TCP, UDP)
3 Network (IP, routing)    ├─ Internet (IP, ICMP)
2 Data Link (Ethernet)     ├─ Link (Ethernet, Wi-Fi)
1 Physical (fiber, radio)  └─ Physical
```
- OSI = teaching model; TCP/IP = real-world stack used on the Internet.

#### 3. Network Interface Basics
- `Network Interface` = logical/physical adapter (e.g., `eth0`, `wlan0`, loopback).
- Each interface has MAC address (Layer 2) and one or more IP addresses (Layer 3).
- `ipconfig`/`ifconfig`/`ip addr` to inspect; `netstat -rn` to view routing table.

#### 4. IP Addressing & Subnets
- IPv4: 32-bit addresses (e.g., `192.168.1.10/24`).
- Subnet mask `/24` = 255.255.255.0 (256 addresses).
- Default gateway route directs traffic outside local subnet.
- CIDR: summarize networks, e.g., `/16` = 65,536 addresses.

#### 5. DNS (Domain Name System)
```
Client → Recursive Resolver → Root → TLD (.com) → Authoritative → IP
                │  (cache?)                 │                │
                └────────────────────────────────────────────┘
                           A/AAAA records returned
```
- DNS record types: `A` (IPv4), `AAAA` (IPv6), `CNAME`, `MX`, `TXT`.
- TTL controls caching duration.
- DNS hijacking: attacker manipulates resolver results. Mitigation: DNSSEC, DoH/DoT, trusted resolvers.

#### 6. DNS Hijacking Scenario
- **Router hijack**: malicious firmware redirects DNS queries to attacker’s resolver.
- **Cache poisoning**: forged responses populate resolver cache with bogus IP.
- Preventive steps: DNSSEC (signed records), TLS connections verifying hostnames, monitoring for unusual DNS responses.

#### 7. Network Topologies
```
Star:       Bus:             Mesh:
   +       A--B--C        A--B
  / \                      |\ 
B   C                     C-D
```
- Star: central switch/hub (common in Ethernet LANs).
- Bus: single backbone (legacy coax networks).
- Mesh: multiple redundant links (used in backbone/backhaul networks).

#### 8. Firewalls
- Filter traffic based on IP/port/protocol/state.
- OS-level (iptables, Windows Firewall) & network appliances (NGFW, AWS Security Group).
- Strategies: default deny vs default allow, inbound vs outbound rules, logging for audits.
- Example rule: `ALLOW tcp/443 from 0.0.0.0/0`, `DENY tcp/22 from public`.

#### 9. TCP vs UDP
| Feature | TCP | UDP |
|---------|-----|-----|
| Reliability | Guaranteed, ordered, retransmissions | Best-effort, may drop/duplicate |
| Use cases | HTTP(S), SSH, SMTP, DB connections | DNS, VoIP, streaming, gaming |
| Overhead | Higher (handshake, ACKs) | Lower |
| Flow control | Built-in (window size) | None |

#### 10. TCP Handshake & Flow
```
Client: SYN ---->
Server:      <---- SYN-ACK
Client: ACK ---->
(connection established)
```
- Teardown: FIN/ACK or abrupt RST.
- Congestion control: slow start, congestion avoidance, fast retransmit.

#### 11. SSH & Remote Access
- Secure Shell (SSH) uses TCP port 22 by default. Provides encrypted login, file transfer, port forwarding.
- Authentication: password, public-key, hardware tokens.
- `ssh user@server` (Linux/macOS) / `ssh.exe` (Windows 10+).
- `ssh -i key.pem ec2-user@host` for key-based auth.
- SSH bastion/jump host:
```
Local → Bastion (public) → Private server
```
- Config file example (`~/.ssh/config`):
```
Host bastion
  HostName bastion.example.com
  User ec2-user
  IdentityFile ~/.ssh/bastion.pem

Host private
  HostName 10.0.1.15
  User ubuntu
  ProxyJump bastion
```

#### 12. File Transfer via SSH
- `scp`: copy over SSH (`scp file user@host:/path`).
- `sftp`: interactive transfer.
- `rsync`: efficient sync (`rsync -avz src/ user@host:/path`).

#### 13. SSH Port Forwarding
- Local forward: `ssh -L 8000:internal:80 user@bastion` (access internal service via localhost).
- Remote forward: `ssh -R 9000:localhost:3000 user@server` (expose local port to remote network).
- Dynamic (SOCKS proxy): `ssh -D 1080 user@server`.

#### 14. Multiple SSH Servers (Chaining)
- Use `ProxyJump` or `ProxyCommand` to chain through multiple hosts.
- Example: Local → Bastion → DMZ host → Private DB (via nested tunnels or `ssh -J`).

#### 15. Remote Terminal Workflow
```
Local terminal
  │
  ├─ ssh user@server (encrypted channel)
  │  └─ Shell/command execution on server
  └─ scp/rsync for file transfers
```
- Use `tmux` or `screen` for persistent sessions.

#### 16. EC2 Hosting Flow (Web App + DB)
```
User → Route53 DNS → CloudFront (optional) → ALB (load balancer)
                                   │
                              Auto Scaling Group (EC2 instances)
                                   │
                             Private Subnet
                                   │
                                RDS/DB
```
- Security groups: allow only required ports.
- IAM roles: grant instances AWS API permissions securely.
- VPC design: public subnets (LB/bastion), private subnets (app/db), NAT gateway for outbound updates.

#### 17. Deploying App on EC2 (Checklist)
1. Launch instance (choose AMI, instance type, key pair).
2. Assign security group (allow SSH from trusted IP, HTTP/HTTPS).
3. Install runtime (Node.js, Docker, etc.).
4. Configure systemd service or container orchestrator.
5. Attach Elastic IP (static) if needed.
6. Set up monitoring (CloudWatch metrics/logs).

#### 18. DNS + SSL for EC2
- Use Route53 `A`/`AAAA` record pointing to load balancer or CloudFront.
- SSL: AWS Certificate Manager (ACM) for load balancer/CloudFront; or use Let’s Encrypt on instances.
- Ensure health checks on load balancer for auto failover.

#### 19. Network Troubleshooting Flow
```
1. Check local network (ipconfig/ifconfig, ping gateway).
2. DNS resolution (nslookup/dig).
3. Connectivity (ping/traceroute).
4. Port reachability (telnet, nc, curl).
5. Firewall/SecurityGroup logs.
```
- Use `tcpdump`/Wireshark to inspect packets.
- `netstat -tulpn` to list listening ports.
- Cloud provider flow logs help track blocked traffic.

#### 20. Transfer via ScriptProcessorNode?
- Historically, `ScriptProcessorNode` (Web Audio API) captured audio buffers to send via WebSocket/WebRTC. Modern approach: `AudioWorklet` + `MediaRecorder` to stream audio/video to server (binary over fetch/WebSocket) while respecting network limits.

#### 21. DNS & Caching Flowchart
```
Browser cache → OS cache → Router cache → ISP recursive resolver
      │ (hit?)  │ (hit?)  │ (hit?)  │
      └─ yes? serve result
         no → query root servers → TLD → authoritative → cache
```

#### 22. doesNotMatch?
- Often appears as validation error when hostname/cert mismatch or regex-based policy fails. In networking context, treat as “sanity check failed” (e.g., verifying TLS cert CN matches DNS name).

#### 23. Tools & Commands Cheat Sheet
- `ping`, `traceroute`/`tracert`: reachability/path.
- `nslookup`, `dig`: DNS inspection.
- `curl -v https://host`: check TLS negotiation & headers.
- `telnet host port`, `nc -vz host port`: test TCP port open.
- `ssh-keygen`, `ssh-add`, `ssh-copy-id` to manage keys.
- `tcpdump -i eth0 port 443`: capture packets.

#### 24. Visual: End-to-End Request Flow
```
Browser → DNS → TCP handshake → TLS handshake → HTTP request → App Server → DB/Cache
```

#### 25. Security Considerations
- Use HTTPS everywhere (ACM/Let’s Encrypt).
- Restrict SSH to bastion/VPN; disable password logins.
- Implement WAF, IDS/IPS, logging, and alerting.
- Rotate credentials/certs regularly; patch OS/services.

#### 26. Connecting Multiple SSH Servers
- Option 1: `ssh -J bastion user@private`.
- Option 2: ProxyCommand: `ProxyCommand ssh bastion nc %h %p`.
- Option 3: VPN/Transit Gateway across VPCs.
- Use `ssh-agent` (`ssh-add key.pem`) to avoid repeated passphrase prompts.

#### 27. File Transfer Automation
```bash
#!/usr/bin/env bash
rsync -avz ./build/ user@server:/var/www/app/
ssh user@server 'sudo systemctl restart app'
```
- Combine with cron/CI for automatic deployments.

#### 28. Monitoring & Observability
- Metrics: latency, throughput, drops, retransmits, CPU/mem usage.
- Tools: CloudWatch, Prometheus/Grafana, ELK stack, Datadog.
- Synthetic monitors (Pingdom) for external health checks.

#### 29. Common Troubleshooting Scenarios
- **DNS wrong IP**: flush caches, correct authoritative record, check TTL.
- **Firewall block**: ensure Security Group/NACL/OS firewall allows traffic.
- **SSL errors**: verify hostname matches cert, chain complete, cert not expired.
- **Latency spikes**: inspect traceroute, consider CDN, check server load.
- **SSH timeout**: verify port 22 reachable, security group permits IP, bastion alive.

#### 30. Diagram: SSH + S3 Upload via EC2
```
Dev Laptop
   │ SSH
   ▼
 Bastion (Public Subnet)
   │ (Internal SSH/HTTPS)
   ▼
 EC2 App (Private Subnet) ──> S3 (data uploads)
   │                        └> RDS (DB)
 CloudWatch monitors metrics/logs
```

#### 31. DNS Workflow for Deployment
1. Acquire domain (Route53/registrar).
2. Set NS records to hosted zone.
3. Add `A`/`AAAA` pointing to ALB or CloudFront.
4. Request ACM certificate; attach to LB/CDN.
5. Update health checks; monitor propagation (respect TTL).

#### 32. SSH Hardening Tips
- Disable root login (`PermitRootLogin no`).
- Enforce key-only auth (`PasswordAuthentication no`).
- Use `AllowUsers` or `AllowGroups`.
- Install `fail2ban` or use AWS SSM Session Manager (no direct SSH).

#### 33. Secure EC2 Networking
- VPC with public + private subnets, NAT for outbound traffic.
- Security groups enforce least privilege (ALB→App, App→DB).
- NACLs for stateless filtering.
- CloudTrail + VPC Flow Logs for auditing.

#### 34. Tools to Learn
- `Wireshark` / `tcpdump`: packet analysis.
- `nmap`: port scanning/security auditing.
- `iperf`: bandwidth tests.
- `mosh`: resilient SSH.
- `autossh`: persistent tunnels.

#### 35. Summary Flowchart
```
User → DNS → CDN/LB → Firewall/Security Groups → App → DB/Cache
             │                         ↑
             └→ Monitoring/Logging/Alerts
```

Learning path: OSI/TCP-IP basics → DNS/IP/subnets → routing/firewalls → SSH/file transfer → cloud networking (VPC/EC2) → automation & observability.




networking with core node js modules -> creating UDP , networking capabilities of node js, socket, transfer file using UDP, create TCP server using node js, handle multiple TCP clients, transfer files with TCP, Understanding HHTP Headers, contolling data speeds, uploading files, creating hhtp server using http modules, http request metods, creating hhtp client, creating web server, 

### Networking with Core Node.js Modules

#### 1. Core Modules Snapshot
| Module | Protocol | Use Case |
|--------|----------|----------|
| `net`  | TCP      | Low-level sockets, proxies, custom protocols |
| `tls`  | TCP+TLS  | Secure sockets / HTTPS                        |
| `dgram`| UDP      | Datagram telemetry, discovery, gaming         |
| `http`/`https` | HTTP/1.1 | REST APIs, uploads, proxies          |
| `http2` | HTTP/2 | Multiplexed streams, gRPC                      |

#### 2. UDP with `dgram`
```js
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
  console.log(`got ${msg} from ${rinfo.address}:${rinfo.port}`);
  server.send(`Echo: ${msg}`, rinfo.port, rinfo.address);
});
server.bind(41234);
```
- Connectionless/unreliable: add sequence numbers + ACK/RESEND logic for file transfer.

#### 3. UDP File Transfer Flow
```
[SEQ|DATA] packet → send via `dgram.send()`
Receiver stores packet by SEQ → requests RESEND for gaps
When all SEQs received → concatenate buffers → save file
```

#### 4. TCP Servers with `net`
```js
const net = require('net');
const server = net.createServer((socket) => {
  console.log('client connected', socket.remoteAddress);
  socket.write('Welcome!\\n');
  socket.on('data', (chunk) => console.log(chunk.toString()));
  socket.on('end', () => console.log('client left'));
});
server.listen(4000);
```
- Socket is duplex stream; broadcast to all clients by iterating a `Set` of sockets.

#### 5. Handling Multiple TCP Clients
```js
const clients = new Set();
server.on('connection', (socket) => {
  clients.add(socket);
  socket.on('data', (chunk) => {
    for (const client of clients) {
      if (client !== socket) client.write(chunk);
    }
  });
  socket.on('close', () => clients.delete(socket));
});
```
- Prevent abuse: set `server.maxConnections`, drop idle sockets with `socket.setTimeout()`.

#### 6. TCP File Transfer
```js
// Sender
fs.createReadStream('file.bin').pipe(socket);
// Receiver
socket.pipe(fs.createWriteStream('copy.bin'));
```
- For resumable transfers send JSON metadata first (size, filename) and track bytes received.

#### 7. HTTP Servers
```js
const http = require('http');
const server = http.createServer(async (req, res) => {
  const body = await collectJSON(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});
server.listen(8080);
```
- `req` is readable stream (`data`/`end` or `for await`); `res` is writable (set headers via `setHeader`, `writeHead`).

#### 8. HTTP Headers & Methods
- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`.
- Headers: `Content-Type`, `Content-Length`, `Authorization`, `Cookie`, `Accept-Encoding`, `Cache-Control`.
- Manage security headers (`Strict-Transport-Security`, `Content-Security-Policy`); inspect `req.headers` object for incoming data.

#### 9. HTTP Client Basics
```js
const options = {
  hostname: 'api.example.com',
  path: '/v1/items',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
};
const req = https.request(options, (res) => {
  res.on('data', (chunk) => process.stdout.write(chunk));
});
req.on('error', console.error);
req.write(JSON.stringify({ foo: 'bar' }));
req.end();
```
- Enable keep-alive via `agent: new https.Agent({ keepAlive: true })`; stream downloads via `res.pipe(fs.createWriteStream(...))`.

#### 10. Controlling Data Speeds
- Wrap streams in token-bucket `Transform` (Throttle) to cap bytes/sec.
- Upload throttling: pause `req` when `req.bytesRead` exceeds threshold, resume after timeout.
- Download throttling: `readStream.pipe(new Throttle(64 * 1024)).pipe(res);`.

#### 11. Uploading Files (Server Side)
```js
const Busboy = require('busboy');
const server = http.createServer((req, res) => {
  if (req.method !== 'POST') return res.writeHead(405).end();
  const busboy = Busboy({ headers: req.headers });
  busboy.on('file', (field, file, info) => {
    file.pipe(fs.createWriteStream(`uploads/${info.filename}`));
  });
  busboy.on('finish', () => res.end('Upload complete'));
  req.pipe(busboy);
});
```

#### 12. HTTP/2 & TLS
- `http2.createSecureServer({ key, cert })` exposes multiplexed `stream` objects (great for gRPC).
- `tls.createServer({ key, cert })` wraps raw sockets for custom secure protocols.

#### 13. Proxy Example
```js
const proxy = http.createServer((clientReq, clientRes) => {
  const upstream = http.request(clientReq.url, {
    method: clientReq.method,
    headers: clientReq.headers,
  }, (upstreamRes) => {
    clientRes.writeHead(upstreamRes.statusCode, upstreamRes.headers);
    upstreamRes.pipe(clientRes);
  });
  clientReq.pipe(upstream);
});
```
- Insert compression/throttle/logging transforms between pipes to customize behavior.

#### 14. Learning Path
1. Build UDP echo + chunked file sender.
2. Write TCP chat/file server (`net`), add TLS.
3. Implement HTTP server/client manually; parse headers/bodies.
4. Support uploads/downloads + throttling/backpressure.
5. Explore HTTP/2 + gRPC, then build proxies/load balancers.




CRUD in express Js-> making file storages in express, dynamic routing in express, handling file uploads in express, CORS, preflight request, path traversal vulenrability, REST API principles, handling file upload using multer in deep, cookies, resizeBy.download()method, router,param(), HTTP redirection, 



authentication, authorization -> hashing , signing cookies, rainbow transferableAbortSignal, bcrypt explain, json webtokens , stateful vs stateless servers, auto deleting documents in mongodb and strictEqual, restricing multiple devices access, googleOauth in deep everything redirection, token exitCode, 

RBAC,-> role based access control

3600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Set-Cookie: session=xyz789; HttpOnly; Secure
Access-Control-Allow-Origin: *
X-Powered-By: Express
```

**Common Headers:**
```javascript
// Content negotiation
Accept: application/json, text/html
Content-Type: application/json; charset=utf-8

// Caching
Cache-Control: no-cache, max-age=3600, must-revalidate
ETag: "686897696a7c876b7e"
If-None-Match: "686897696a7c876b7e"

// Security
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000

// CORS
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization

// Authentication
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WWW-Authenticate: Bearer realm="API"

// Compression
Accept-Encoding: gzip, deflate, br
Content-Encoding: gzip
```

### Controlling Data Transfer Speed

```javascript
const http = require('http');
const fs = require('fs');
const { Transform } = require('stream');

// Throttle stream (limit speed)
class ThrottleStream extends Transform {
  constructor(bytesPerSecond) {
    super();
    this.bytesPerSecond = bytesPerSecond;
    this.bytesWritten = 0;
    this.startTime = Date.now();
  }

  _transform(chunk, encoding, callback) {
    this.bytesWritten += chunk.length;
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const expectedBytes = this.bytesPerSecond * elapsedTime;
    
    if (this.bytesWritten > expectedBytes) {
      const delay = ((this.bytesWritten - expectedBytes) / this.bytesPerSecond) * 1000;
      setTimeout(() => {
        this.push(chunk);
        callback();
      }, delay);
    } else {
      this.push(chunk);
      callback();
    }
  }
}

// Server with throttling
const server = http.createServer((req, res) => {
  const filePath = './large-file.mp4';
  const throttle = new ThrottleStream(100 * 1024); // 100KB/s
  
  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Content-Length': fs.statSync(filePath).size
  });
  
  fs.createReadStream(filePath)
    .pipe(throttle)
    .pipe(res);
});

server.listen(3000);
```

### Uploading Files via HTTP

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple file upload server (no dependencies)
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    const filename = req.headers['x-filename'] || 'uploaded_file';
    const filepath = path.join(__dirname, 'uploads', filename);
    
    const writeStream = fs.createWriteStream(filepath);
    
    req.pipe(writeStream);
    
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'File uploaded',
        filename 
      }));
    });
    
    req.on('error', (err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000);

// Client-side upload (Node.js)
const http = require('http');
const fs = require('fs');

function uploadFile(filepath) {
  const filename = path.basename(filepath);
  const fileStream = fs.createReadStream(filepath);
  const stats = fs.statSync(filepath);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stats.size,
      'X-Filename': filename
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(data));
  });
  
  fileStream.pipe(req);
  
  req.on('error', (err) => console.error(err));
}

uploadFile('./document.pdf');
```

### Creating HTTP Server with http Module

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // req: IncomingMessage (readable stream)
  // res: ServerResponse (writable stream)
  
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  
  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  
  // Handle different routes
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Home Page</h1>');
  } else if (pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello API' }));
  } else if (pathname === '/api/post' && req.method === 'POST') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: data }));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### HTTP Request Methods

```
GET     - Retrieve resource (idempotent, cacheable)
POST    - Create resource (not idempotent)
PUT     - Update/replace resource (idempotent)
PATCH   - Partial update (not necessarily idempotent)
DELETE  - Delete resource (idempotent)
HEAD    - Same as GET but no body (metadata only)
OPTIONS - Get allowed methods (CORS preflight)
CONNECT - Establish tunnel (for proxies)
TRACE   - Echo request (debugging)
```

**Idempotent**: Multiple identical requests have same effect as single request

```javascript
// Example handling different methods
const server = http.createServer((req, res) => {
  const { method, url } = req;
  
  if (url === '/api/users') {
    switch (method) {
      case 'GET':
        // Retrieve users
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{ id: 1, name: 'John' }]));
        break;
        
      case 'POST':
        // Create user
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const user = JSON.parse(body);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: 2, ...user }));
        });
        break;
        
      case 'PUT':
        // Update user
        break;
        
      case 'DELETE':
        // Delete user
        break;
        
      case 'OPTIONS':
        // CORS preflight
        res.writeHead(204, {
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        break;
        
      default:
        res.writeHead(405); // Method Not Allowed
        res.end();
    }
  }
});
```

### Creating HTTP Client

```javascript
const http = require('http');

// Simple GET request
http.get('http://api.example.com/data', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});

// POST request
const postData = JSON.stringify({ name: 'John', age: 30 });

const options = {
  hostname: 'api.example.com',
  port: 80,
  path: '/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', (err) => {
  console.error('Error:', err.message);
});

req.write(postData);
req.end();

// With promises
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ data, statusCode: res.statusCode }));
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Usage
(async () => {
  try {
    const result = await httpRequest('http://api.example.com/data');
    console.log(result);
  } catch (err) {
    console.error(err);
  }
})();
```

### Creating Basic Web Server

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        // 500 Server Error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(3000, () => {
  console.log('Web server running on http://localhost:3000');
});
```

---

## 11. Express.js & REST APIs

### Installing Express

```bash
npm install express
```

### Basic Express Server

```javascript
const express = require('express');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello Express!');
});

app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.post('/api/users', (req, res) => {
  const user = req.body;
  res.status(201).json({ id: 2, ...user });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### CRUD Operations in Express

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// In-memory data store
let users = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

// CREATE - POST /api/users
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  
  const user = {
    id: users.length + 1,
    name,
    email
  };
  
  users.push(user);
  res.status(201).json(user);
});

// READ - GET /api/users (all)
app.get('/api/users', (req, res) => {
  res.json(users);
});

// READ - GET /api/users/:id (single)
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// UPDATE - PUT /api/users/:id
app.put('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { name, email } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  
  res.json(user);
});

// DELETE - DELETE /api/users/:id
app.delete('/api/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users.splice(index, 1);
  res.status(204).send();
});

app.listen(3000);
```

### File Storage in Express

```javascript
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// Load data from file
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Save data to file
async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Routes with file persistence
app.get('/api/users', async (req, res) => {
  try {
    const users = await loadData();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const users = await loadData();
    const newUser = {
      id: Date.now(),
      ...req.body
    };
    users.push(newUser);
    await saveData(users);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.listen(3000);
```

### Dynamic Routing in Express

```javascript
const express = require('express');
const app = express();

// Route parameters
app.get('/users/:userId', (req, res) => {
  const { userId } = req.params;
  res.json({ userId });
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.json({ userId, postId });
});

// Query parameters
app.get('/search', (req, res) => {
  const { q, page, limit } = req.query;
  // URL: /search?q=nodejs&page=1&limit=10
  res.json({ query: q, page, limit });
});

// Route patterns
app.get('/files/*', (req, res) => {
  // Matches /files/a, /files/a/b, etc.
  res.json({ path: req.params[0] });
});

// Regular expressions
app.get(/^\/users\/(\d+)$/, (req, res) => {
  // Only matches /users/ followed by digits
  res.json({ userId: req.params[0] });
});

// Optional parameters
app.get('/users/:id?', (req, res) => {
  if (req.params.id) {
    res.json({ user: req.params.id });
  } else {
    res.json({ users: 'all' });
  }
});

app.listen(3000);
```

### Handling File Uploads in Express

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Simple file upload (without multer)
app.post('/upload', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  
  const filename = Date.now() + '-' + (req.headers['x-filename'] || 'file');
  const filepath = path.join(uploadDir, filename);
  const writeStream = fs.createWriteStream(filepath);
  
  req.pipe(writeStream);
  
  writeStream.on('finish', () => {
    res.json({ 
      success: true, 
      filename,
      path: `/uploads/${filename}`
    });
  });
  
  writeStream.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(3000);
```

### Multer for File Uploads

```bash
npm install multer
```

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

// Create multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter
});

// Single file upload
app.post('/upload/single', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    path: req.file.path
  });
});

// Multiple files upload
app.post('/upload/multiple', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const files = req.files.map(file => ({
    filename: file.filename,
    originalname: file.originalname,
    size: file.size
  }));
  
  res.json({ files });
});

// Multiple fields
app.post('/upload/fields', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 8 }
]), (req, res) => {
  res.json({
    avatar: req.files['avatar'],
    gallery: req.files['gallery']
  });
});

// Error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

app.listen(3000);
```

### CORS (Cross-Origin Resource Sharing)

```javascript
const express = require('express');
const app = express();

// Manual CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Or use cors package
const cors = require('cors');

// Enable all CORS requests
app.use(cors());

// Configure CORS
app.use(cors({
  origin: 'https://example.com', // Allow specific origin
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Multiple origins
const allowedOrigins = ['https://example.com', 'https://app.example.com'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Per-route CORS
app.get('/api/public', cors(), (req, res) => {
  res.json({ message: 'Public API' });
});

app.listen(3000);
```

### Preflight Request

Preflight is an OPTIONS request sent before actual request for certain conditions:
- HTTP methods: PUT, DELETE, PATCH
- Custom headers
- Content-Type other than: application/x-www-form-urlencoded, multipart/form-data, text/plain

```
Browser                          Server
  │                                │
  ├─── OPTIONS /api/users ────────>│
  │    (Preflight request)          │
  │                                │
  │<─── 204 No Content ────────────┤
  │    Access-Control-Allow-Origin │
  │    Access-Control-Allow-Methods│
  │                                │
  ├─── POST /api/users ───────────>│
  │    (Actual request)             │
  │                                │
  │<─── 201 Created ───────────────┤
  │                                │
```

### Path Traversal Vulnerability

**Vulnerability**: Attacker accesses files outside intended directory

```javascript
// VULNERABLE CODE
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'public', filename);
  res.sendFile(filepath);
});

// Attack: GET /files/../../../etc/passwd
// Accesses system files!

// SECURE CODE
app.get('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // Remove path components
  const filepath = path.join(__dirname, 'public', filename);
  
  // Verify path is within public directory
  if (!filepath.startsWith(path.join(__dirname, 'public'))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.sendFile(filepath);
});
```

### REST API Principles

**REST (Representational State Transfer)** principles:

1. **Client-Server**: Separation of concerns
2. **Stateless**: Each request contains all necessary information
3. **Cacheable**: Responses must define themselves as cacheable or not
4. **Uniform Interface**: Consistent API structure
5. **Layered System**: Client doesn't know if connected to end server or intermediary
6. **Code on Demand** (optional): Server can extend client functionality

**RESTful URL Design:**
```
GET    /api/users           # Get all users
GET    /api/users/123       # Get user 123
POST   /api/users           # Create user
PUT    /api/users/123       # Update user 123 (full)
PATCH  /api/users/123       # Update user 123 (partial)
DELETE /api/users/123       # Delete user 123

GET    /api/users/123/posts # Get posts by user 123
POST   /api/users/123/posts # Create post for user 123
```

**HTTP Status Codes:**
```
2xx Success
200 OK                  # Request succeeded
201 Created             # Resource created
204 No Content          # Success but no content to return

3xx Redirection
301 Moved Permanently   # Resource moved
304 Not Modified        # Cached version is still valid

4xx Client Errors
400 Bad Request         # Invalid request
401 Unauthorized        # Authentication required
403 Forbidden           # No permission
404 Not Found           # Resource doesn't exist
409 Conflict            # Conflict with current state
422 Unprocessable Entity# Validation error

5xx Server Errors
500 Internal Server Error
503 Service Unavailable
```

### Express Router

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get all users' });
});

router.get('/:id', (req, res) => {
  res.json({ message: `Get user ${req.params.id}` });
});

router.post('/', (req, res) => {
  res.status(201).json({ message: 'User created' });
});

module.exports = router;

// app.js
const express = require('express');
const usersRouter = require('./routes/users');

const app = express();

app.use('/api/users', usersRouter);

app.listen(3000);
```

### router.param() Middleware

```javascript
const express = require('express');
const router = express.Router();

// Middleware for :userId parameter
router.param('userId', (req, res, next, id) => {
  // Fetch user from database
  const user = getUserById(id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Attach to request
  req.user = user;
  next();
});

// All routes with :userId will execute param middleware first
router.get('/users/:userId', (req, res) => {
  res.json(req.user); // User already loaded
});

router.put('/users/:userId', (req, res) => {
  // Update req.user
  res.json(req.user);
});

router.delete('/users/:userId', (req, res) => {
  // Delete req.user
  res.status(204).send();
});

module.exports = router;
```

### HTTP Redirection

```javascript
const express = require('express');
const app = express();

// Simple redirect
app.get('/old-page', (req, res) => {
  res.redirect('/new-page');
});

// Permanent redirect (301)
app.get('/old-url', (req, res) => {
  res.redirect(301, '/new-url');
});

// Redirect with status codes
app.get('/temp', (req, res) => {
  res.redirect(302, '/temporary-location'); // Temporary (default)
});

app.get('/permanent', (req, res) => {
  res.redirect(301, '/new-location'); // Permanent
});

// Redirect back
app.post('/form', (req, res) => {
  // Process form
  res.redirect('back'); // Go to referring page
});

// External redirect
app.get('/google', (req, res) => {
  res.redirect('https://www.google.com');
});

// Conditional redirect
app.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.render('login');
  }
});

app.listen(3000);
```

### res.download() Method

```javascript
const express = require('express');
const path = require('path');
const app = express();

// Download file
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'files', filename);
  
  // Basic download
  res.download(filepath);
  
  // With custom filename
  res.download(filepath, 'custom-name.pdf');
  
  // With callback
  res.download(filepath, (err) => {
    if (err) {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(404).send('File not found');
      }
    }
  } else {
    console.log('File downloaded successfully');
  }
});
});

// Download with headers
app.get('/report', (req, res) => {
const filepath = path.join(__dirname, 'reports', 'monthly.pdf');

res.setHeader('Content-Disposition', 'attachment; filename="Monthly_Report.pdf"');
res.setHeader('Content-Type', 'application/pdf');

res.sendFile(filepath);
});

app.listen(3000);
```

---

## 12. Authentication & Authorization

### Authentication vs Authorization

**Authentication**: Verifying who you are (identity)
**Authorization**: Verifying what you can do (permissions)

```
┌────────────────────────────────────┐
│      User Login Request            │
└───────────────┬────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│      AUTHENTICATION                │
│  "Are you who you say you are?"    │
│  - Username/Password               │
│  - Token verification              │
│  - Biometrics                      │
└───────────────┬────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│      AUTHORIZATION                 │
│  "What are you allowed to do?"     │
│  - Check user role                 │
│  - Check permissions               │
│  - Access control                  │
└────────────────────────────────────┘
```

### Hashing

**Hashing**: One-way function that converts data into fixed-size string

```javascript
const crypto = require('crypto');

// Simple hash
function hash(data) {
return crypto.createHash('sha256').update(data).digest('hex');
}

console.log(hash('password123'));
// Output: ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f

// Problem: Same input = same hash (vulnerable to rainbow tables)
console.log(hash('password123')); // Same hash!
```

### Salting

**Salt**: Random data added to password before hashing

```javascript
const crypto = require('crypto');

function hashPassword(password) {
// Generate random salt
const salt = crypto.randomBytes(16).toString('hex');

// Hash password with salt
const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

// Store both salt and hash
return { salt, hash };
}

function verifyPassword(password, salt, hash) {
const hashToVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
return hash === hashToVerify;
}

// Usage
const { salt, hash } = hashPassword('myPassword123');
console.log('Salt:', salt);
console.log('Hash:', hash);

// Verify
const isValid = verifyPassword('myPassword123', salt, hash);
console.log('Valid:', isValid); // true
```

### Rainbow Tables

**Rainbow Table**: Precomputed table of hash values for common passwords

```
Password    →  Hash (without salt)
password    →  5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
123456      →  8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
qwerty      →  65e84be33532fb784c48129675f9eff3a682b27168c0ea744b2cf58ee02337c5

Attack: Lookup hash in rainbow table → Find password
```

**Defense: Salting**
```
Password + Salt  →  Hash
password + xyz   →  abc123...
password + uvw   →  def456...  (Different hash!)

Rainbow tables are useless because each user has unique salt
```

### bcrypt

Industry-standard library for hashing passwords with automatic salting.

```bash
npm install bcrypt
```

```javascript
const bcrypt = require('bcrypt');

// Hash password
async function hashPassword(password) {
const saltRounds = 10; // Cost factor (2^10 iterations)
const hash = await bcrypt.hash(password, saltRounds);
return hash;
}

// Verify password
async function verifyPassword(password, hash) {
const isValid = await bcrypt.compare(password, hash);
return isValid;
}

// Usage
(async () => {
const password = 'mySecurePassword';

// Hash (includes salt automatically)
const hash = await hashPassword(password);
console.log('Hash:', hash);
// $2b$10$N9qo8uLOickgx2ZMRZoMye1234567890abcdefghijklmnopqrstuv
//  │  │  │                    └─ hash
//  │  │  └─ salt
//  │  └─ cost factor
//  └─ bcrypt version

// Verify
console.log(await verifyPassword('mySecurePassword', hash)); // true
console.log(await verifyPassword('wrongPassword', hash));    // false
})();

// Synchronous (blocking - avoid in production)
const hashSync = bcrypt.hashSync('password', 10);
const isValidSync = bcrypt.compareSync('password', hashSync);
```

**How bcrypt works:**
1. Generates random salt
2. Combines password + salt
3. Applies expensive key derivation function (Blowfish cipher)
4. Repeats 2^cost times (saltRounds)
5. Returns combined salt + hash

**Why bcrypt is secure:**
- Slow by design (prevents brute force)
- Adaptive (can increase cost over time)
- Built-in salt management

### Cookies

```javascript
const express = require('express');
const app = express();

// Set cookie
app.get('/set-cookie', (req, res) => {
res.cookie('username', 'john', {
  maxAge: 900000,      // 15 minutes (in ms)
  httpOnly: true,      // Not accessible via JavaScript
  secure: true,        // Only sent over HTTPS
  sameSite: 'strict'   // CSRF protection
});

res.send('Cookie set');
});

// Read cookie (requires cookie-parser)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/get-cookie', (req, res) => {
const username = req.cookies.username;
res.send(`Username: ${username}`);
});

// Delete cookie
app.get('/delete-cookie', (req, res) => {
res.clearCookie('username');
res.send('Cookie deleted');
});

// Cookie options
const cookieOptions = {
maxAge: 24 * 60 * 60 * 1000,  // 1 day
httpOnly: true,                // Prevents XSS
secure: process.env.NODE_ENV === 'production', // HTTPS only in production
sameSite: 'lax',               // CSRF protection (lax/strict/none)
domain: '.example.com',        // Cookie domain
path: '/'                      // Cookie path
};

app.listen(3000);
```

### Signed Cookies

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();

// Use secret for signing cookies
app.use(cookieParser('my-secret-key-12345'));

// Set signed cookie
app.get('/set-signed', (req, res) => {
res.cookie('userId', '12345', { 
  signed: true,
  httpOnly: true
});
res.send('Signed cookie set');
});

// Read signed cookie
app.get('/get-signed', (req, res) => {
const userId = req.signedCookies.userId;

if (!userId) {
  return res.status(401).send('Invalid or tampered cookie');
}

res.send(`User ID: ${userId}`);
});

app.listen(3000);
```

**How signed cookies work:**
```
Cookie Value: userId=12345
Secret: my-secret-key
HMAC: SHA256(userId=12345 + my-secret-key)

Sent to client: userId=s:12345.HMAC_SIGNATURE

Server verifies HMAC before trusting cookie
If tampered → HMAC doesn't match → Reject
```

### JSON Web Tokens (JWT)

```bash
npm install jsonwebtoken
```

```javascript
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your-secret-key-keep-it-safe';

// Generate JWT
function generateToken(payload) {
return jwt.sign(payload, SECRET_KEY, {
  expiresIn: '1h',           // Token expires in 1 hour
  issuer: 'myapp.com',       // Who issued the token
  subject: 'user-auth'       // What the token is for
});
}

// Verify JWT
function verifyToken(token) {
try {
  const decoded = jwt.verify(token, SECRET_KEY);
  return decoded;
} catch (err) {
  throw new Error('Invalid token');
}
}

// Usage
const user = { id: 123, email: 'user@example.com', role: 'admin' };
const token = generateToken(user);

console.log('Token:', token);
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2MzI0MjQwMDAsImV4cCI6MTYzMjQyNzYwMH0.xyz...

// Verify
const decoded = verifyToken(token);
console.log('Decoded:', decoded);
// { id: 123, email: 'user@example.com', role: 'admin', iat: ..., exp: ... }
```

**JWT Structure:**
```
Header.Payload.Signature

Header (base64):
{
"alg": "HS256",      // Algorithm
"typ": "JWT"         // Type
}

Payload (base64):
{
"id": 123,
"email": "user@example.com",
"iat": 1632424000,   // Issued at
"exp": 1632427600    // Expires at
}

Signature:
HMACSHA256(
base64UrlEncode(header) + "." + base64UrlEncode(payload),
secret
)
```

### JWT Authentication in Express

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Mock user database
const users = [
{ id: 1, email: 'user@example.com', password: '$2b$10$...' } // hashed password
];

// Register
app.post('/register', async (req, res) => {
const { email, password } = req.body;

// Check if user exists
if (users.find(u => u.email === email)) {
  return res.status(400).json({ error: 'User already exists' });
}

// Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// Create user
const user = {
  id: users.length + 1,
  email,
  password: hashedPassword
};

users.push(user);

res.status(201).json({ message: 'User created', userId: user.id });
});

// Login
app.post('/login', async (req, res) => {
const { email, password } = req.body;

// Find user
const user = users.find(u => u.email === email);
if (!user) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

// Verify password
const isValid = await bcrypt.compare(password, user.password);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

// Generate token
const token = jwt.sign(
  { id: user.id, email: user.email },
  SECRET_KEY,
  { expiresIn: '1h' }
);

res.json({ token });
});

// Authentication middleware
function authenticate(req, res, next) {
const authHeader = req.headers.authorization;

if (!authHeader) {
  return res.status(401).json({ error: 'No token provided' });
}

// Format: "Bearer TOKEN"
const token = authHeader.split(' ')[1];

try {
  const decoded = jwt.verify(token, SECRET_KEY);
  req.user = decoded;
  next();
} catch (err) {
  return res.status(401).json({ error: 'Invalid token' });
}
}

// Protected route
app.get('/profile', authenticate, (req, res) => {
res.json({ user: req.user });
});

app.listen(3000);
```

### Stateful vs Stateless Servers

**Stateful Server:**
```
┌─────────────────────────────────────┐
│           Server                    │
│  ┌───────────────────────────────┐  │
│  │   Session Store               │  │
│  │   session123: {userId: 1}     │  │
│  │   session456: {userId: 2}     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

Client                    Server
│                         │
├─── Request + Cookie ───>│
│    (session123)         │
│                         │
│<─── Look up session ────┤
│    (Find user data)     │
│                         │
```

**Pros**: Server has full control, can invalidate sessions
**Cons**: Doesn't scale well, requires shared session store

**Stateless Server:**
```
┌─────────────────────────────────────┐
│           Server                    │
│  (No session storage)               │
│  Verifies JWT signature only        │
└─────────────────────────────────────┘

Client                    Server
│                         │
├─── Request + JWT ──────>│
│    (contains user data) │
│                         │
│<─── Verify JWT ─────────┤
│    (Decode payload)     │
│                         │
```

**Pros**: Scales easily, no server storage needed
**Cons**: Can't invalidate tokens (until expiry)

### Auto-Deleting Documents in MongoDB

```javascript
const mongoose = require('mongoose');

// Schema with TTL (Time To Live) index
const sessionSchema = new mongoose.Schema({
userId: { type: mongoose.Schema.Types.ObjectId, required: true },
token: { type: String, required: true },
createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
});

// Alternative: expireAfterSeconds
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const Session = mongoose.model('Session', sessionSchema);

// Document will be automatically deleted after 1 hour
await Session.create({
userId: '507f1f77bcf86cd799439011',
token: 'abc123'
});

// For conditional expiry
const verificationSchema = new mongoose.Schema({
email: String,
code: String,
expiresAt: { type: Date, required: true }
});

verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Document expires at specific time
await Verification.create({
email: 'user@example.com',
code: '123456',
expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
});
```

### Restricting Multiple Device Access

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Session schema (one active session per user)
const sessionSchema = new mongoose.Schema({
userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
token: { type: String, required: true },
deviceInfo: { type: String },
createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);

// Login - creates new session, invalidates old ones
app.post('/login', async (req, res) => {
const { email, password } = req.body;

// Authenticate user (omitted for brevity)
const user = await User.findOne({ email });

// Generate token
const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '7d' });

// Delete existing sessions (force logout on other devices)
await Session.deleteMany({ userId: user._id });

// Create new session
await Session.create({
  userId: user._id,
  token,
  deviceInfo: req.headers['user-agent']
});

res.json({ token });
});

// Authentication middleware
async function authenticate(req, res, next) {
const token = req.headers.authorization?.split(' ')[1];

if (!token) {
  return res.status(401).json({ error: 'No token' });
}

try {
  const decoded = jwt.verify(token, SECRET_KEY);
  
  // Check if session exists
  const session = await Session.findOne({ userId: decoded.id, token });
  
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  
  req.user = decoded;
  next();
} catch (err) {
  return res.status(401).json({ error: 'Invalid token' });
}
}

// Logout
app.post('/logout', authenticate, async (req, res) => {
await Session.deleteOne({ userId: req.user.id });
res.json({ message: 'Logged out' });
});

// Logout all devices
app.post('/logout-all', authenticate, async (req, res) => {
await Session.deleteMany({ userId: req.user.id });
res.json({ message: 'Logged out from all devices' });
});

app.listen(3000);
```

### Google OAuth 2.0

```bash
npm install passport passport-google-oauth20 express-session
```

```javascript
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();

// Session configuration
app.use(session({
secret: 'your-session-secret',
resave: false,
saveUninitialized: false,
cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  // Find or create user in database
  let user = await User.findOne({ googleId: profile.id });
  
  if (!user) {
    user = await User.create({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      photo: profile.photos[0].value
    });
  }
  
  return done(null, user);
}
));

// Serialize user
passport.serializeUser((user, done) => {
done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
const user = await User.findById(id);
done(null, user);
});

// Routes
app.get('/auth/google',
passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
passport.authenticate('google', { failureRedirect: '/login' }),
(req, res) => {
  res.redirect('/dashboard');
}
);

// Protected route
app.get('/dashboard', (req, res) => {
if (!req.isAuthenticated()) {
  return res.redirect('/login');
}
res.json({ user: req.user });
});

// Logout
app.get('/logout', (req, res) => {
req.logout((err) => {
  if (err) return next(err);
  res.redirect('/');
});
});

app.listen(3000);
```

**OAuth 2.0 Flow:**
```
┌────────┐                                  ┌──────────┐
│        │                                  │  Google  │
│ Client │                                  │  OAuth   │
│        │                                  │  Server  │
└───┬────┘                                  └────┬─────┘
  │                                            │
  ├─1. Click "Login with Google"──────────────┤
  │                                            │
  │<─2. Redirect to Google consent screen─────┤
  │                                            │
  ├─3. User grants permission─────────────────>│
  │                                            │
  │<─4. Redirect back with auth code──────────┤
  │                                            │
  ├─5. Exchange code for access token─────────>│
  │                                            │
  │<─6. Return access token───────────────────┤
  │                                            │
  ├─7. Fetch user profile with token──────────>│
  │                                            │
  │<─8. Return user data──────────────────────┤
  │                                            │
  │  9. Create session and login user          │
  │                                            │
```

### RBAC (Role-Based Access Control)

```javascript
const express = require('express');
const app = express();

// User roles
const ROLES = {
ADMIN: 'admin',
EDITOR: 'editor',
VIEWER: 'viewer'
};

// Permissions
const PERMISSIONS = {
[ROLES.ADMIN]: ['read', 'write', 'delete', 'manage_users'],
[ROLES.EDITOR]: ['read', 'write'],
[ROLES.VIEWER]: ['read']
};

// Authorization middleware
function authorize(...allowedRoles) {
return (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};
}

// Check specific permission
function can(permission) {
return (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const userPermissions = PERMISSIONS[req.user.role] || [];
  
  if (!userPermissions.includes(permission)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  next();
};
}

// Routes with RBAC
app.get('/articles', authorize(ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN), (req, res) => {
res.json({ articles: [] });
});

app.post('/articles', authorize(ROLES.EDITOR, ROLES.ADMIN), (req, res) => {
res.json({ message: 'Article created' });
});

app.delete('/articles/:id', authorize(ROLES.ADMIN), (req, res) => {
res.json({ message: 'Article deleted' });
});

// Using permission-based authorization
app.get('/users', can('manage_users'), (req, res) => {
res.json({ users: [] });
});

// Advanced: Resource-based authorization
function authorizeResource(resourceField = 'userId') {
return async (req, res, next) => {
  const resourceId = req.params.id;
  const resource = await getResource(resourceId);
  
  // Admins can access any resource
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }
  
  // Users can only access their own resources
  if (resource[resourceField] !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};
}

app.put('/posts/:id', authorizeResource('authorId'), (req, res) => {
res.json({ message: 'Post updated' });
});

app.listen(3000);
```

**RBAC Hierarchy:**
```
┌──────────────────────────────────────┐
│            ADMIN                     │
│  - Full access                       │
│  - User management                   │
│  - System configuration              │
└──────────────┬───────────────────────┘
             │
┌──────────────▼───────────────────────┐
│            EDITOR                    │
│  - Create content                    │
│  - Edit own content                  │
│  - View all content                  │
└──────────────┬───────────────────────┘
             │
┌──────────────▼───────────────────────┐
│            VIEWER                    │
│  - View content only                 │
│  - No write access                   │
└──────────────────────────────────────┘
```

---

## Summary Flowchart: Complete Backend Flow

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                        │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  DNS RESOLUTION                          │
│  Domain → IP Address                                     │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                TCP/IP CONNECTION                         │
│  3-way handshake                                         │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  HTTP REQUEST                            │
│  Method, Headers, Body                                   │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 EXPRESS SERVER                           │
│  1. Middleware (CORS, Body Parser)                       │
│  2. Authentication (JWT/Session)                         │
│  3. Authorization (RBAC)                                 │
│  4. Route Handler                                        │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC                              │
│  - Validate input                                        │
│  - Process data                                          │
│  - Database operations                                   │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE                                │
│  MongoDB, PostgreSQL, etc.                               │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                HTTP RESPONSE                             │
│  Status Code, Headers, Body                              │
└────────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    CLIENT                                │
│  Receives and processes response                         │
└─────────────────────────────────────────────────────────┘
```

This comprehensive guide covers all fundamental concepts of Node.js backend development, from OS basics to authentication systems. Each section includes practical examples and in-depth explanations to help you understand and implement these concepts effectively.
































# Complete Node.js & Backend Development Notes

## Table of Contents
1. [Node.js Client-Server Architecture](#1-nodejs-client-server-architecture)
2. [CLI Basics & Terminal Commands](#2-cli-basics--terminal-commands)
3. [Operating System Fundamentals](#3-operating-system-fundamentals)
4. [Node.js Fundamentals](#4-nodejs-fundamentals)
5. [Data Representation in Computing](#5-data-representation-in-computing)
6. [Buffers in Node.js](#6-buffers-in-nodejs)
7. [Event-Driven Architecture](#7-event-driven-architecture)
8. [Streams in Node.js](#8-streams-in-nodejs)
9. [Computer Networking Fundamentals](#9-computer-networking-fundamentals)
10. [HTTP & Web Servers](#10-http--web-servers)
11. [Express.js & REST APIs](#11-expressjs--rest-apis)
12. [Authentication & Authorization](#12-authentication--authorization)

---

## 1. Node.js Client-Server Architecture

### What is Client-Server Architecture?

**Client-Server Architecture** is a distributed computing model where:
- **Client**: Requests services/resources (e.g., web browser, mobile app)
- **Server**: Provides services/resources (e.g., web server, database server)

```
┌─────────────┐          Request          ┌─────────────┐
│             │ ────────────────────────> │             │
│   CLIENT    │                           │   SERVER    │
│  (Browser)  │ <──────────────────────── │  (Node.js)  │
└─────────────┘          Response         └─────────────┘
```

### Node.js as a Server

Node.js runs on the **V8 JavaScript engine** and uses an **event-driven, non-blocking I/O model**.

**Key Components:**
- **Single-threaded event loop**: Handles multiple concurrent requests
- **Non-blocking I/O**: Operations don't block the execution thread
- **Asynchronous by default**: Uses callbacks, promises, async/await

```javascript
// Simple HTTP Server
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World!\n');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
```

---

## 2. CLI Basics & Terminal Commands

### CLI vs GUI

**CLI (Command Line Interface)**:
- Text-based interface
- Fast and efficient for repetitive tasks
- Less resource-intensive
- Steep learning curve

**GUI (Graphical User Interface)**:
- Visual interface with windows, icons
- User-friendly
- More resource-intensive
- Limited automation

### Essential Linux/Unix Commands

#### Navigation Commands

```bash
# pwd - Print Working Directory (shows current directory)
pwd
# Output: /home/user/projects

# ls - List directory contents
ls           # Basic listing
ls -l        # Long format (detailed)
ls -a        # Show hidden files
ls -lah      # Long format, all files, human-readable sizes

# cd - Change Directory
cd /path/to/directory
cd ..        # Go up one directory
cd ~         # Go to home directory
cd -         # Go to previous directory
```

#### File Operations

```bash
# Creating files
touch filename.txt              # Create empty file
echo "content" > file.txt       # Create file with content
echo "more" >> file.txt         # Append to file

# Copying
cp source.txt destination.txt   # Copy file
cp -r dir1/ dir2/              # Copy directory recursively

# Moving/Renaming
mv oldname.txt newname.txt     # Rename file
mv file.txt /new/path/         # Move file

# Deleting
rm file.txt                    # Remove file
rm -r directory/               # Remove directory recursively
rm -rf directory/              # Force remove (dangerous!)
```

#### Viewing Files

```bash
# cat - Concatenate and display
cat file.txt

# less - View file with pagination
less file.txt

# head - View first lines
head -n 10 file.txt

# tail - View last lines
tail -n 10 file.txt
tail -f logfile.txt  # Follow file (real-time updates)

# grep - Search in files
grep "pattern" file.txt
grep -r "pattern" directory/  # Recursive search
```

#### Text Editors

**nano** (beginner-friendly):
```bash
nano file.txt
# Ctrl+O: Save
# Ctrl+X: Exit
# Ctrl+K: Cut line
# Ctrl+U: Paste
```

**vim** (advanced):
```bash
vim file.txt
# i: Insert mode
# Esc: Command mode
# :w: Save
# :q: Quit
# :wq: Save and quit
# dd: Delete line
# yy: Copy line
# p: Paste
```

#### Compression Commands

```bash
# gzip - Compress files
gzip file.txt          # Creates file.txt.gz
gunzip file.txt.gz     # Decompress

# tar - Archive files
tar -czf archive.tar.gz directory/   # Create compressed archive
tar -xzf archive.tar.gz              # Extract archive
tar -tzf archive.tar.gz              # List contents
```

#### System Information

```bash
# whoami - Current username
whoami

# hostname - System name
hostname

# uname - System information
uname -a

# df - Disk usage
df -h

# du - Directory size
du -sh directory/

# top/htop - Process monitor
top
```

### Configuring Terminal (.bashrc)

The `.bashrc` file configures your bash shell environment.

```bash
# ~/.bashrc

# Aliases
alias ll='ls -lah'
alias gs='git status'
alias ..='cd ..'

# Environment Variables
export PATH="$PATH:/new/path"
export NODE_ENV="development"

# Custom prompt
PS1='\u@\h:\w\$ '

# Functions
mkcd() {
  mkdir -p "$1" && cd "$1"
}

# Load .bashrc changes
source ~/.bashrc
```

---

## 3. Operating System Fundamentals

### CPU Architecture

```
┌─────────────────────────────────────┐
│            CPU (Processor)          │
├─────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │Core 1│  │Core 2│  │Core 3│ ...  │
│  └──────┘  └──────┘  └──────┘      │
│                                     │
│  ┌────────────────────────────┐    │
│  │    L1 Cache (fastest)      │    │
│  ├────────────────────────────┤    │
│  │    L2 Cache                │    │
│  ├────────────────────────────┤    │
│  │    L3 Cache (shared)       │    │
│  └────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Definitions:**

- **CPU (Central Processing Unit)**: The "brain" of the computer that executes instructions
- **Processor**: Physical chip containing one or more CPU cores
- **Core**: Independent processing unit within a CPU (can execute instructions separately)
- **Thread**: Virtual version of a CPU core (via Hyper-Threading/SMT)

### Operating System Layers

```
┌───────────────────────────────────┐
│   Applications (Node.js, etc.)    │
├───────────────────────────────────┤
│      System Libraries (libc)      │
├───────────────────────────────────┤
│           System Calls            │
├───────────────────────────────────┤
│     Kernel (Linux, Windows, etc)  │
├───────────────────────────────────┤
│       Hardware (CPU, RAM, etc)    │
└───────────────────────────────────┘
```

**Kernel**: Core component of OS that manages:
- Process management
- Memory management
- Device drivers
- System calls
- File systems

### Process vs Thread

```
┌─────────────────────────────────────────┐
│              PROCESS                    │
│  ┌─────────────────────────────────┐   │
│  │  Memory Space (isolated)        │   │
│  │  ┌────┐  ┌────┐  ┌────┐        │   │
│  │  │Code│  │Data│  │Heap│        │   │
│  │  └────┘  └────┘  └────┘        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────────┐  ┌──────────┐           │
│  │ Thread 1 │  │ Thread 2 │ (shared   │
│  │  Stack   │  │  Stack   │  memory)  │
│  └──────────┘  └──────────┘           │
└─────────────────────────────────────────┘
```

**Process:**
- Independent execution unit
- Own memory space
- Isolated from other processes
- Heavy resource usage

**Thread:**
- Lightweight execution unit within a process
- Shares memory with other threads in same process
- Faster context switching
- Lower resource overhead

### Concurrency vs Parallelism

**Concurrency**: Multiple tasks making progress (appears simultaneous)
```
Single Core:
Time ─────────────────────────────>
     [Task A][Task B][Task A][Task B]
     (Context switching)
```

**Parallelism**: Multiple tasks executing simultaneously
```
Multi-Core:
Core 1: [Task A──────────────────────]
Core 2: [Task B──────────────────────]
        (True simultaneous execution)
```

### Worker Threads in Node.js

Node.js is **single-threaded** by default, but can use **Worker Threads** for CPU-intensive tasks.

```javascript
// main.js
const { Worker } = require('worker_threads');

// Create worker
const worker = new Worker('./worker.js', {
  workerData: { num: 5 }
});

// Receive message from worker
worker.on('message', (result) => {
  console.log(`Result: ${result}`);
});

worker.on('error', (error) => {
  console.error(error);
});

worker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Worker stopped with exit code ${code}`);
  }
});
```

```javascript
// worker.js
const { parentPort, workerData } = require('worker_threads');

// Perform CPU-intensive operation
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

const result = factorial(workerData.num);
parentPort.postMessage(result);
```

**Worker Thread Architecture:**
```
┌─────────────────────────────────────┐
│         Main Thread                 │
│  ┌───────────────────────────┐     │
│  │   Event Loop              │     │
│  └───────────────────────────┘     │
│         │                           │
│         │ spawns                    │
│         ▼                           │
│  ┌───────────────┐ ┌─────────────┐ │
│  │ Worker Thread │ │Worker Thread│ │
│  │  (separate    │ │ (separate   │ │
│  │   thread)     │ │  thread)    │ │
│  └───────────────┘ └─────────────┘ │
└─────────────────────────────────────┘
```

### Environment Variables

Environment variables store configuration and system information.

```javascript
// Accessing environment variables
console.log(process.env.NODE_ENV);  // 'development' or 'production'
console.log(process.env.PORT);      // Server port
console.log(process.env.HOME);      // User home directory

// Setting in code
process.env.CUSTOM_VAR = 'value';

// Using .env file (with dotenv package)
require('dotenv').config();
console.log(process.env.DATABASE_URL);
```

**.env file:**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/mydb
API_KEY=secret123
```

### File Permissions (Unix/Linux)

```bash
# Permission format: -rwxrwxrwx
# Position:          -[user][group][others]

# r = read (4)
# w = write (2)
# x = execute (1)

ls -l file.txt
# -rw-r--r-- 1 user group 1024 Nov 17 10:00 file.txt
# │││││││││
# │││└┴┴┴┴┴─ others: r-- (read only) = 4
# ││└┴┴┴──── group: r-- (read only) = 4
# │└┴┴────── user: rw- (read+write) = 6
# └───────── file type (- = regular file, d = directory)
```

**Managing Permissions:**
```bash
# chmod - Change permissions
chmod 755 script.sh     # rwxr-xr-x
chmod +x script.sh      # Add execute permission
chmod -w file.txt       # Remove write permission
chmod u+x,g-w file.txt  # User add execute, group remove write

# chown - Change owner
chown user:group file.txt

# Executable files
chmod +x script.sh
./script.sh  # Run executable
```

**Making Node.js script executable:**
```javascript
#!/usr/bin/env node
// script.js

console.log('Hello from executable script!');
```

```bash
chmod +x script.js
./script.js  # Can now run directly
```

### Process Object in Node.js

```javascript
// Process information
console.log(process.pid);           // Process ID
console.log(process.ppid);          // Parent process ID
console.log(process.platform);      // 'linux', 'darwin', 'win32'
console.log(process.arch);          // 'x64', 'arm64', etc.
console.log(process.version);       // Node.js version
console.log(process.cwd());         // Current working directory

// CPU Usage
console.log(process.cpuUsage());    
// { user: 38579, system: 6986 } (microseconds)

// Memory Usage
console.log(process.memoryUsage());
// {
//   rss: 32309248,        // Resident Set Size (total memory)
//   heapTotal: 6537216,   // Total heap allocated
//   heapUsed: 4447216,    // Heap actually used
//   external: 1221617,    // C++ objects
//   arrayBuffers: 26606   // ArrayBuffers and SharedArrayBuffers
// }

// Command line arguments
console.log(process.argv);
// ['node', 'script.js', 'arg1', 'arg2']

// Environment
console.log(process.env);

// Exit codes
process.exit(0);  // Success
process.exit(1);  // Failure

// Event listeners
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});

// Signals
process.on('SIGINT', () => {
  console.log('Received SIGINT (Ctrl+C)');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  // Cleanup and exit
  process.exit(0);
});
```

---

## 4. Node.js Fundamentals

### Module Systems

#### CommonJS (CJS)

Default module system in Node.js:

```javascript
// math.js (exporting)
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { add, subtract };
// or: exports.add = add;

// app.js (importing)
const math = require('./math');
console.log(math.add(2, 3));  // 5

// Destructuring
const { add } = require('./math');
console.log(add(2, 3));  // 5
```

**Module Object:**
```javascript
console.log(module);
// {
//   id: '.',
//   path: '/path/to/directory',
//   exports: {},
//   filename: '/path/to/file.js',
//   loaded: false,
//   children: [],
//   paths: [...]
// }
```

**Module Wrapper Function:**

Node.js wraps every module in a function:
```javascript
(function(exports, require, module, __filename, __dirname) {
  // Your module code here
  console.log(__filename);  // Full file path
  console.log(__dirname);   // Directory path
});
```

#### ES6 Modules (ESM)

Modern JavaScript module system:

```javascript
// math.mjs (or .js with "type": "module" in package.json)
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

// Default export
export default function multiply(a, b) {
  return a * b;
}

// app.mjs
import multiply, { add, subtract } from './math.mjs';
console.log(add(2, 3));       // 5
console.log(multiply(2, 3));  // 6
```

**Accessing __filename and __dirname in ES6:**
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__filename);
console.log(__dirname);
```

### CommonJS vs ES6 Modules

| Feature | CommonJS | ES6 Modules |
|---------|----------|-------------|
| Syntax | `require()`, `module.exports` | `import`, `export` |
| Loading | Synchronous | Asynchronous |
| When loaded | Runtime | Parse time (static) |
| Dynamic imports | Native | Needs `import()` |
| File extension | .js | .mjs or .js with `"type": "module"` |
| Top-level await | ❌ No | ✅ Yes |
| Tree-shaking | ❌ No | ✅ Yes |

### Built-in Modules in Node.js

```javascript
// View all built-in modules
import { builtinModules } from 'module';
console.log(builtinModules);

// Common built-in modules:
const fs = require('fs');           // File system
const path = require('path');       // File paths
const http = require('http');       // HTTP server
const https = require('https');     // HTTPS server
const os = require('os');           // Operating system
const crypto = require('crypto');   // Cryptography
const events = require('events');   // Event emitter
const stream = require('stream');   // Streams
const util = require('util');       // Utilities
const child_process = require('child_process');  // Child processes
const cluster = require('cluster'); // Clustering
const net = require('net');         // TCP/IPC
const dgram = require('dgram');     // UDP
const dns = require('dns');         // DNS lookups
const url = require('url');         // URL parsing
const querystring = require('querystring'); // Query strings
const buffer = require('buffer');   // Buffer class
const timers = require('timers');   // Timers
const zlib = require('zlib');       // Compression
```

### NPM (Node Package Manager)

```bash
# Initialize project
npm init              # Interactive
npm init -y          # Default values

# Install packages
npm install express             # Local dependency
npm install -D nodemon          # Dev dependency
npm install -g typescript       # Global package
npm install express@4.18.2      # Specific version

# Uninstall
npm uninstall express

# Update
npm update express
npm outdated                    # Check outdated packages

# List packages
npm list                        # Local packages
npm list -g --depth=0          # Global packages

# Run scripts
npm run dev
npm start
npm test
```

### package.json

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "description": "My Node.js application",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "keywords": ["nodejs", "api"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Version Semantics (Semver):**
```
"express": "^4.18.2"
            │ │  │
            │ │  └─ Patch (bug fixes)
            │ └──── Minor (new features, backward compatible)
            └────── Major (breaking changes)

^4.18.2  →  >=4.18.2 <5.0.0  (compatible with minor/patch updates)
~4.18.2  →  >=4.18.2 <4.19.0  (compatible with patch updates only)
4.18.2   →  Exact version
*        →  Any version
```

### Publishing to NPM

```bash
# 1. Create account
npm adduser

# 2. Login
npm login

# 3. Prepare package.json
{
  "name": "my-unique-package-name",
  "version": "1.0.0",
  "main": "index.js",
  "files": ["index.js", "lib/"],  # Files to include
  "repository": {
    "type": "git",
    "url": "https://github.com/user/repo"
  }
}

# 4. Create .npmignore (like .gitignore)
node_modules/
.env
*.test.js

# 5. Publish
npm publish

# Update package
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.1 → 1.1.0
npm version major  # 1.1.0 → 2.0.0
npm publish
```

### Shebang (#!)

Makes scripts executable directly:

```javascript
#!/usr/bin/env node

console.log('Hello from CLI!');
```

```bash
chmod +x script.js
./script.js  # Run without 'node' command
```

### Library vs CLI Packages

**Library Package:**
```javascript
// package.json
{
  "name": "my-library",
  "main": "index.js"
}

// index.js
module.exports = {
  someFunction: () => {}
};

// Usage
const lib = require('my-library');
```

**CLI Package:**
```javascript
// package.json
{
  "name": "my-cli",
  "bin": {
    "mycli": "./cli.js"
  }
}

// cli.js
#!/usr/bin/env node
console.log('CLI tool running!');

// After npm install -g my-cli
// Usage: mycli
```

### Local vs Global Packages

**Local** (project-specific):
```bash
npm install express
# Installs to: ./node_modules/express
# Used in project code
```

**Global** (system-wide):
```bash
npm install -g typescript
# Installs to: /usr/local/lib/node_modules/typescript
# Available as command-line tool
```

### NPX (Node Package Execute)

Executes packages without installing globally:

```bash
# Without npx (old way)
npm install -g create-react-app
create-react-app my-app

# With npx (modern way)
npx create-react-app my-app  # Downloads, runs, then removes

# Run specific version
npx typescript@4.9.5 --version

# Run local package
npx nodemon server.js
```

**How NPX works:**
1. Checks if package exists in local `node_modules/.bin`
2. If not, checks global installation
3. If not found, downloads to temporary cache
4. Executes the package
5. Removes from cache (unless cached)

---

## 5. Data Representation in Computing

### Number Systems

#### Binary (Base-2)
```
Digits: 0, 1
Example: 1011 = 1×2³ + 0×2² + 1×2¹ + 1×2⁰ = 8 + 0 + 2 + 1 = 11
```

#### Decimal (Base-10)
```
Digits: 0-9
Example: 123 = 1×10² + 2×10¹ + 3×10⁰ = 100 + 20 + 3 = 123
```

#### Hexadecimal (Base-16)
```
Digits: 0-9, A-F
Example: 0x2F = 2×16¹ + 15×16⁰ = 32 + 15 = 47
```

```javascript
// Conversions
let num = 255;
console.log(num.toString(2));   // '11111111' (binary)
console.log(num.toString(16));  // 'ff' (hex)

let binary = '11111111';
console.log(parseInt(binary, 2)); // 255

let hex = 'ff';
console.log(parseInt(hex, 16));   // 255
```

### Character Sets vs Character Encodings

**Character Set**: Collection of characters (e.g., alphabet, numbers, symbols)

**Character Encoding**: How characters are represented as bytes

```
Character → Code Point → Bytes
   'A'    →    U+0041  →  0x41 (in ASCII/UTF-8)
   '€'    →    U+20AC  →  0xE2 0x82 0xAC (in UTF-8)
```

### ASCII (American Standard Code for Information Interchange)

- 7-bit encoding (128 characters)
- Characters 0-127
- Includes English letters, digits, punctuation, control characters

```
Decimal | Hex | Char
--------|-----|-----
   65   | 41  |  A
   97   | 61  |  a
   48   | 30  |  0
   32   | 20  | (space)
```

```javascript
'A'.charCodeAt(0);  // 65
String.fromCharCode(65);  // 'A'
```

### ISO-8859-1 (Latin-1)

- 8-bit encoding (256 characters)
- Extends ASCII with Western European characters
- Characters 0-255

### Unicode

Universal character set covering all writing systems worldwide.

**Code Points**: U+0000 to U+10FFFF (1,114,112 code points)

**Unicode Planes:**
```
Plane 0: BMP (Basic Multilingual Plane) - U+0000 to U+FFFF
  - Most common characters (Latin, Greek, Cyrillic, Chinese, etc.)
  
Plane 1: SMP (Supplementary Multilingual Plane) - U+10000 to U+1FFFF
  - Historic scripts, emoji, symbols
  
Plane 2: SIP (Supplementary Ideographic Plane)
  - Rare CJK ideographs
  
Planes 3-13: Unassigned
  
Plane 14: SSP (Supplementary Special-purpose Plane)
  - Tag characters, variation selectors
  
Planes 15-16: Private Use
```

### UTF-8, UTF-16, UTF-32

**UTF-8** (Variable-length: 1-4 bytes):
```
U+0000   - U+007F:    1 byte   [0xxxxxxx]
U+0080   - U+07FF:    2 bytes  [110xxxxx 10xxxxxx]
U+0800   - U+FFFF:    3 bytes  [1110xxxx 10xxxxxx 10xxxxxx]
U+10000  - U+10FFFF:  4 bytes  [11110xxx 10xxxxxx 10xxxxxx 10xxxxxx]

Example:
'A'    (U+0041):   01000001                    (1 byte)
'€'    (U+20AC):   11100010 10000010 10101100 (3 bytes)
'😀'   (U+1F600):  11110000 10011111 10011000 10000000 (4 bytes)
```

**UTF-16** (Variable-length: 2 or 4 bytes):
```
U+0000  - U+FFFF:  2 bytes (16 bits)
U+10000 - U+10FFFF: 4 bytes (surrogate pairs)

Example:
'A'  (U+0041):   0041 (2 bytes)
'😀' (U+1F600):  D83D DE00 (4 bytes, surrogate pair)
```

**UTF-32** (Fixed-length: 4 bytes):
```
Every character = 4 bytes (32 bits)
Simple but wasteful of space

Example:
'A'  (U+0041):   00000041 (4 bytes)
'😀' (U+1F600):  0001F600 (4 bytes)
```

```javascript
// JavaScript uses UTF-16 internally
'A'.length;      // 1
'😀'.length;     // 2 (surrogate pair in UTF-16)

// Iterate properly over Unicode characters
for (let char of '😀🎉') {
  console.log(char);  // '😀', '🎉'
}

// Get code point
'😀'.codePointAt(0);  // 128512 (0x1F600)
String.fromCodePoint(0x1F600);  // '😀'
```

### BOM (Byte Order Mark)

Special character (U+FEFF) at file beginning indicating:
- Encoding (UTF-8, UTF-16, UTF-32)
- Byte order (endianness)

```
UTF-8:     EF BB BF
UTF-16 BE: FE FF (Big Endian)
UTF-16 LE: FF FE (Little Endian)
UTF-32 BE: 00 00 FE FF
UTF-32 LE: FF FE 00 00
```

### Endianness

Order of bytes in multi-byte values:

**Big Endian** (Most significant byte first):
```
Value: 0x12345678
Memory: [12] [34] [56] [78]
        ↑
    Address 0x00
```

**Little Endian** (Least significant byte first):
```
Value: 0x12345678
Memory: [78] [56] [34] [12]
        ↑
    Address 0x00
```

```javascript
// Check system endianness
const buffer = new ArrayBuffer(2);
const uint16 = new Uint16Array(buffer);
const uint8 = new Uint8Array(buffer);

uint16[0] = 0xAABB;

if (uint8[0] === 0xBB) {
  console.log('Little Endian');
} else {
  console.log('Big Endian');
}
```

### EBCDIC (Extended Binary Coded Decimal Interchange Code)

- IBM mainframe encoding
- 8-bit encoding (256 characters)
- Different from ASCII (incompatible)
- Still used in legacy IBM systems

```
ASCII 'A' = 65 (0x41)
EBCDIC 'A' = 193 (0xC1)
```

---

## 6. Buffers in Node.js

### What are Buffers?

Buffers are **fixed-size chunks of memory** allocated outside the V8 heap for handling binary data.

```
┌─────────────────────────────────────┐
│         V8 Heap Memory              │
│  (JavaScript objects, strings)      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Buffer Memory (C++ layer)      │
│  (Binary data, outside V8 heap)     │
└─────────────────────────────────────┘
```

### Creating Buffers

#### Buffer.alloc() vs Buffer.allocUnsafe()

```javascript
// Buffer.alloc() - Safe, initialized with zeros
const buf1 = Buffer.alloc(10);
console.log(buf1);  // <Buffer 00 00 00 00 00 00 00 00 00 00>

// Buffer.allocUnsafe() - Fast but uninitialized (may contain old data)
const buf2 = Buffer.allocUnsafe(10);
console.log(buf2);  // <Buffer ?? ?? ?? ?? ?? ?? ?? ?? ?? ??>
// Must fill before use to avoid security issues

// Buffer.from() - Create from existing data
const buf3 = Buffer.from('Hello');
const buf4 = Buffer.from([72, 101, 108, 108, 111]);
const buf5 = Buffer.from(buf3);  // Copy buffer
```

**When to use which:**
- `Buffer.alloc()`: When you need guaranteed zero-filled memory (safer)
- `Buffer.allocUnsafe()`: When performance is critical and you'll immediately fill it
- `Buffer.from()`: When converting from strings, arrays, or copying buffers

### Buffer Pool

Node.js uses a buffer pool to optimize small buffer allocations:

```javascript
// Buffers < 4KB use the pool
const buf1 = Buffer.allocUnsafe(100);   // Uses pool
const buf2 = Buffer.allocUnsafe(100);   // Uses same pool

// Buffers >= 4KB get dedicated memory
const buf3 = Buffer.allocUnsafe(8192);  // Dedicated allocation

// Buffer.alloc() doesn't use pool (always zero-filled)
const buf4 = Buffer.alloc(100);  // Separate allocation
```

```
Buffer Pool (8KB):
┌─────────────────────────────────────┐
│ [buf1: 100 bytes] [buf2: 100 bytes] │
│ [available space: ~7896 bytes]      │
└─────────────────────────────────────┘
```

### Buffer Methods and Properties

```javascript
const buf = Buffer.from('Hello World');

// Length
console.log(buf.length);  // 11 bytes

// Access individual bytes
console.log(buf[0]);      // 72 (ASCII 'H')
buf[0] = 74;              // Change to 'J'

// Write data
buf.write('Hi', 0);       // Write at offset 0
buf.write('Node', 3, 4);  // Write 4 bytes at offset 3

// Read data
console.log(buf.toString());           // 'Hi Node'
console.log(buf.toString('hex'));      // '48692050...'
console.log(buf.toString('base64'));   // 'SGkgTm9kZQ=='

// Slice (creates view, not copy)
const slice = buf.slice(0, 5);
slice[0] = 65;  // Modifies original buffer too!

// Copy (creates independent copy)
const copy = Buffer.alloc(buf.length);
buf.copy(copy);
copy[0] = 65;  // Doesn't affect original

// Concatenate
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');
const result = Buffer.concat([buf1, buf2]);
console.log(result.toString());  // 'Hello World'

// Compare
const bufA = Buffer.from('abc');
const bufB = Buffer.from('abd');
console.log(bufA.compare(bufB));  // -1 (bufA < bufB)

// Equals
console.log(bufA.equals(bufB));  // false

// Fill
buf.fill(0);  // Fill with zeros
buf.fill('x');  // Fill with character

// Includes
console.log(buf.includes('World'));  // true

// Index of
console.log(buf.indexOf('World'));  // 6
```

### ArrayBuffers and TypedArrays

**ArrayBuffer**: Fixed-length raw binary data buffer (generic)

**TypedArray**: View to interpret ArrayBuffer data with specific type

```javascript
// Create ArrayBuffer (16 bytes)
const buffer = new ArrayBuffer(16);

// Create views
const int8View = new Int8Array(buffer);      // 16 elements (1 byte each)
const int16View = new Int16Array(buffer);    // 8 elements (2 bytes each)
const int32View = new Int32Array(buffer);    // 4 elements (4 bytes each)
const float64View = new Float64Array(buffer); // 2 elements (8 bytes each)

// All views share the same underlying memory
int32View[0] = 0x12345678;
console.log(int8View[0]);  // 0x78 (Little Endian)
console.log(int8View[1]);  // 0x56
console.log(int8View[2]);  // 0x34
console.log(int8View[3]);  // 0x12
```

**TypedArray Types:**
```javascript
Int8Array          // -128 to 127
Uint8Array         // 0 to 255
Uint8ClampedArray  // 0 to 255 (clamped)
Int16Array         // -32768 to 32767
Uint16Array        // 0 to 65535
Int32Array         // -2^31 to 2^31-1
Uint32Array        // 0 to 2^32-1
Float32Array       // 32-bit floating point
Float64Array       // 64-bit floating point
BigInt64Array      // 64-bit signed BigInt
BigUint64Array     // 64-bit unsigned BigInt
```

### Signed vs Unsigned Integers

**Signed**: Can represent negative numbers (uses MSB for sign)
```
Int8: -128 to 127
Binary: 10000000 = -128, 01111111 = 127

Int16: -32768 to 32767
```

**Unsigned**: Only positive numbers (all bits for magnitude)
```
Uint8: 0 to 255
Binary: 00000000 = 0, 11111111 = 255

Uint16: 0 to 65535
```

```javascript
// Signed
const signed = new Int8Array(1);
signed[0] = -50;
console.log(signed[0]);  // -50

// Unsigned
const unsigned = new Uint8Array(1);
unsigned[0] = -50;  // Wraps around
console.log(unsigned[0]);  // 206 (256 - 50)
```

### Reading and Writing ArrayBuffers

```javascript
const buffer = new ArrayBuffer(8);
const view = new DataView(buffer);

// Writing different types
view.setInt8(0, -128);           // 1 byte at offset 0
view.setUint16(1, 65535);        // 2 bytes at offset 1
view.setFloat32(4, 3.14);        // 4 bytes at offset 4

// Reading
console.log(view.getInt8(0));    // -128
console.log(view.getUint16(1));  // 65535
console.log(view.getFloat32(4)); // 3.14...

// With endianness control
view.setUint32(0, 0x12345678, true);   // Little Endian
view.setUint32(0, 0x12345678, false);  // Big Endian
```

### Multibyte Data Handling

```javascript
// Writing multibyte integer
const buf = Buffer.allocUnsafe(4);
buf.writeInt32BE(0x12345678, 0);  // Big Endian
console.log(buf);  // <Buffer 12 34 56 78>

buf.writeInt32LE(0x12345678, 0);  // Little Endian
console.log(buf);  // <Buffer 78 56 34 12>

// Reading multibyte integer
const value = buf.readInt32BE(0);
console.log(value.toString(16));  // 0x78563412

// Various integer methods
buf.writeUInt8(255, 0);      // 1 byte
buf.writeUInt16BE(65535, 0); // 2 bytes
buf.writeUInt32LE(0xFFFFFFFF, 0);  // 4 bytes
buf.writeFloatBE(3.14, 0);   // 4 bytes
buf.writeDoubleBE(3.14, 0);  // 8 bytes
```

### Transferring ArrayBuffer Data

#### To Disk (File)

```javascript
const fs = require('fs').promises;

// ArrayBuffer to file
async function saveArrayBuffer(buffer, filename) {
  const uint8Array = new Uint8Array(buffer);
  await fs.writeFile(filename, uint8Array);
}

// File to ArrayBuffer
async function loadArrayBuffer(filename) {
  const buffer = await fs.readFile(filename);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

// Usage
const ab = new ArrayBuffer(100);
await saveArrayBuffer(ab, 'data.bin');
const loaded = await loadArrayBuffer('data.bin');
```

#### Over Network

```javascript
const http = require('http');

// Send ArrayBuffer over HTTP
const server = http.createServer((req, res) => {
  const buffer = new ArrayBuffer(1024);
  const view = new Uint8Array(buffer);
  view.fill(65);  // Fill with 'A'
  
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': buffer.byteLength
  });
  res.end(Buffer.from(buffer));
});

// Receive ArrayBuffer
const https = require('https');

https.get('https://example.com/data.bin', (res) => {
  const chunks = [];
  
  res.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    console.log('Received:', arrayBuffer.byteLength, 'bytes');
  });
});
```

### Buffer to/from ArrayBuffer Conversion

```javascript
// Buffer to ArrayBuffer
const buf = Buffer.from('Hello');
const ab = buf.buffer.slice(
  buf.byteOffset,
  buf.byteOffset + buf.byteLength
);

// ArrayBuffer to Buffer
const arrayBuffer = new ArrayBuffer(5);
const buffer = Buffer.from(arrayBuffer);

// Shared memory (view only)
const sharedBuf = Buffer.from(
  arrayBuffer,
  0,  // offset
  5   // length
);
```

### Use Cases for Buffers

1. **File I/O**: Reading/writing binary files
2. **Network I/O**: TCP/UDP socket data
3. **Cryptography**: Hashing, encryption
4. **Image Processing**: Manipulating pixel data
5. **Protocol Implementation**: Binary protocols (HTTP/2, WebSocket)
6. **Data Compression**: gzip, deflate
7. **Streaming**: Audio/video data

### Limitations of Buffers

1. **Fixed Size**: Cannot be resized after creation
2. **Memory Limit**: Maximum size depends on system (usually ~2GB)
3. **No Automatic Garbage Collection**: Must manually manage large buffers
4. **Encoding Issues**: Must handle character encoding explicitly
5. **Security**: `allocUnsafe()` can leak sensitive data if not filled

```javascript
// Example: Buffer size limit
try {
  const hugeBuf = Buffer.alloc(2 * 1024 * 1024 * 1024); // 2GB
} catch (err) {
  console.error('Buffer too large:', err.message);
}

// Solution: Use streams for large data
const fs = require('fs');
const readStream = fs.createReadStream('large-file.dat');
readStream.on('data', (chunk) => {
  // Process chunk by chunk
});
```

---

## 7. Event-Driven Architecture

### Asynchronous I/O in Node.js

Node.js is built on **non-blocking, event-driven I/O**.

```
┌────────────────────────────────────────┐
│        JavaScript Code (Main Thread)   │
│              Event Loop                │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│          libuv (C++ layer)             │
│  ┌──────────────────────────────────┐  │
│  │  Thread Pool (I/O operations)    │  │
│  │  - File I/O                      │  │
│  │  - DNS lookups                   │  │
│  │  - CPU-intensive tasks           │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│       Operating System                 │
│  (File system, Network, etc.)          │
└────────────────────────────────────────┘
```

### CPU Operations vs I/O Operations

**CPU Operations** (Synchronous, blocking):
```javascript
// Mathematical calculations
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Blocks the event loop
console.log(fibonacci(40));  // Takes several seconds
```

**I/O Operations** (Asynchronous, non-blocking):
```javascript
// File reading (non-blocking)
fs.readFile('file.txt', (err, data) => {
  console.log(data);
});

// Network request (non-blocking)
http.get('http://api.example.com', (res) => {
  console.log(res.statusCode);
});

// Event loop continues while I/O happens in background
console.log('This runs immediately');
```

### Event Loop

The Event Loop is the core of Node.js's asynchronous architecture.

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │     pending callbacks     │  I/O callbacks (TCP errors, etc.)
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │       idle, prepare       │  Internal use only
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │           poll            │  I/O events, execute callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │           check           │  setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │      close callbacks      │  socket.on('close', ...)
│  └─────────────┬─────────────┘
│                │
└────────────────┘

    Microtasks (process.nextTick, Promises)
    execute between each phase
```

**Execution Order Example:**
```javascript
console.log('1: Start');

setTimeout(() => console.log('2: setTimeout'), 0);

setImmediate(() => console.log('3: setImmediate'));

process.nextTick(() => console.log('4: nextTick'));

Promise.resolve().then(() => console.log('5: Promise'));

console.log('6: End');

// Output:
// 1: Start
// 6: End
// 4: nextTick
// 5: Promise
// 2: setTimeout
// 3: setImmediate
```

### Custom EventEmitters

EventEmitter is the foundation of event-driven programming in Node.js.

```javascript
const EventEmitter = require('events');

// Create custom emitter
class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter();

// Register event listener
emitter.on('event', (arg1, arg2) => {
  console.log('Event occurred:', arg1, arg2);
});

// Emit event
emitter.emit('event', 'Hello', 'World');
// Output: Event occurred: Hello World

// One-time listener
emitter.once('single', () => {
  console.log('Fires only once');
});

emitter.emit('single');  // Fires
emitter.emit('single');  // Doesn't fire

// Remove listener
const listener = () => console.log('Listener');
emitter.on('test', listener);
emitter.removeListener('test', listener);
// or
emitter.off('test', listener);

// Remove all listeners
emitter.removeAllListeners('test');

// Error handling
emitter.on('error', (err) => {
  console.error('Error occurred:', err);
});

// Get listener count
console.log(emitter.listenerCount('event'));

// Get listeners
console.log(emitter.listeners('event'));
```

### Practical EventEmitter Example

```javascript
const EventEmitter = require('events');
const fs = require('fs');

class FileWatcher extends EventEmitter {
  constructor(filename) {
    super();
    this.filename = filename;
    this.watcher = null;
  }

  watch() {
    this.watcher = fs.watch(this.filename, (eventType, filename) => {
      if (eventType === 'change') {
        this.emit('fileChanged', filename);
      }
    });
    this.emit('watchStarted', this.filename);
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.emit('watchStopped', this.filename);
    }
  }
}

// Usage
const watcher = new FileWatcher('config.json');

watcher.on('watchStarted', (file) => {
  console.log(`Started watching: ${file}`);
});

watcher.on('fileChanged', (file) => {
  console.log(`File changed: ${file}`);
  // Reload configuration
});

watcher.on('watchStopped', (file) => {
  console.log(`Stopped watching: ${file}`);
});

watcher.watch();

// Stop after 60 seconds
setTimeout(() => watcher.stop(), 60000);
```

### Event-Driven Architecture Pattern

```
┌─────────────────────────────────────────┐
│          Application Layer              │
│   (Business Logic, Controllers)         │
└───────────────┬─────────────────────────┘
                │ emits events
                ▼
┌─────────────────────────────────────────┐
│          Event Bus / Emitter            │
└───────────────┬─────────────────────────┘
                │ notifies listeners
                ▼
┌─────────────────────────────────────────┐
│          Event Handlers                 │
│  - Logger                               │
│  - Email Service                        │
│  - Analytics                            │
│  - Cache Invalidation                   │
└─────────────────────────────────────────┘
```

**Example: Order Processing System**
```javascript
const EventEmitter = require('events');

class OrderSystem extends EventEmitter {
  placeOrder(order) {
    // Validate order
    if (!order.items || order.items.length === 0) {
      this.emit('orderFailed', order, 'No items');
      return;
    }

    // Process order
    order.id = Date.now();
    order.status = 'confirmed';
    
    // Emit success event
    this.emit('orderPlaced', order);
  }
}

const orderSystem = new OrderSystem();

// Logger handler
orderSystem.on('orderPlaced', (order) => {
  console.log(`[LOG] Order ${order.id} placed`);
});

// Email handler
orderSystem.on('orderPlaced', (order) => {
  console.log(`[EMAIL] Sending confirmation to ${order.email}`);
  // sendEmail(order.email, 'Order Confirmation', ...);
});

// Inventory handler
orderSystem.on('orderPlaced', (order) => {
  console.log(`[INVENTORY] Reducing stock for ${order.items.length} items`);
  // updateInventory(order.items);
});

// Analytics handler
orderSystem.on('orderPlaced', (order) => {
  console.log(`[ANALYTICS] Recording order ${order.id}`);
  // trackAnalytics('order_placed', order);
});

// Error handler
orderSystem.on('orderFailed', (order, reason) => {
  console.error(`[ERROR] Order failed: ${reason}`);
});

// Place order
orderSystem.placeOrder({
  email: 'customer@example.com',
  items: [{ id: 1, name: 'Product A', qty: 2 }]
});
```

---

## 8. Streams in Node.js

### What are Streams?

Streams are **collections of data that might not be available all at once**. They allow processing data piece by piece without loading everything into memory.

```
Traditional (Load entire file):
┌──────────────────────────────────┐
│  [====== 1GB File ======]        │ → Memory
└──────────────────────────────────┘
         ↓
    Process all at once

Streams (Chunk by chunk):
┌──────────────────────────────────┐
│  [64KB] → Process → [64KB] →     │
│  Process → [64KB] → Process...   │
└──────────────────────────────────┘
```

### Types of Streams

1. **Readable**: Source of data (read from)
2. **Writable**: Destination for data (write to)
3. **Duplex**: Both readable and writable
4. **Transform**: Duplex stream that modifies data

```
Readable  ────────────> Writable
   │                        ▲
   │                        │
   └──> Transform Stream ───┘
         (Duplex)
```

### Readable Streams

```javascript
const fs = require('fs');

// Create readable stream
const readStream = fs.createReadStream('large-file.txt', {
  encoding: 'utf8',
  highWaterMark: 64 * 1024  // 64KB chunks
});

// Event: 'data' - chunk available
readStream.on('data', (chunk) => {
  console.log(`Received ${chunk.length} bytes`);
  console.log(chunk);
});

// Event: 'end' - no more data
readStream.on('end', () => {
  console.log('Finished reading');
});

// Event: 'error'
readStream.on('error', (err) => {
  console.error('Error:', err);
});

// Event: 'close'
readStream.on('close', () => {
  console.log('Stream closed');
});

// Pause and resume
readStream.pause();
setTimeout(() => readStream.resume(), 1000);

// Read manually (flowing → paused mode)
readStream.on('readable', () => {
  let chunk;
  while ((chunk = readStream.read()) !== null) {
    console.log(`Read ${chunk.length} bytes`);
  }
});
```

### States of Readable Streams

**1. Flowing Mode**: Data flows automatically
```javascript
// Automatically triggered by:
stream.on('data', () => {});
stream.pipe(destination);
stream.resume();
```

**2. Paused Mode**: Data must be explicitly read
```javascript
// Triggered by:
stream.pause();
stream.on('readable', () => {});
```

```
┌─────────────┐
│   Paused    │
│    Mode     │
└──────┬──────┘
       │
       │ .resume() / .pipe() / on('data')
       ▼
┌─────────────┐
│   Flowing   │
│    Mode     │
└──────┬──────┘
       │
       │ .pause() / on('readable')
       ▼
┌─────────────┐
│   Paused    │
│    Mode     │
└─────────────┘
```

### Writable Streams

```javascript
const fs = require('fs');

// Create writable stream
const writeStream = fs.createWriteStream('output.txt', {
  encoding: 'utf8'
});

// Write data
const success = writeStream.write('Hello World\n');

if (!success) {
  console.log('Buffer full, waiting for drain...');
}

// Event: 'drain' - buffer emptied, ready for more
writeStream.on('drain', () => {
  console.log('Can write more data');
});

// Event: 'finish' - all data flushed
writeStream.on('finish', () => {
  console.log('All data written');
});

// Event: 'error'
writeStream.on('error', (err) => {
  console.error('Write error:', err);
});

// End stream
writeStream.end('Final data\n');
// or
writeStream.write('Data');
writeStream.end();
```

### Backpressure

**Backpressure** occurs when data is written faster than it can be consumed.

```
Fast Producer ──[data]──> Slow Consumer
                          ↓
                    Buffer fills up
                          ↓
                  Backpressure signal
                          ↓
                  Producer should pause
```

**Handling Backpressure:**
```javascript
const fs = require('fs');

const readable = fs.createReadStream('input.txt');
const writable = fs.createWriteStream('output.txt');

readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk);
  
  if (!canContinue) {
    // Buffer is full, pause reading
    readable.pause();
    console.log('Paused reading due to backpressure');
  }
});

writable.on('drain', () => {
  // Buffer emptied, resume reading
  readable.resume();
  console.log('Resumed reading');
});

readable.on('end', () => {
  writable.end();
});
```

### Internal Buffer of Writable Stream

```
┌──────────────────────────────────────┐
│      Writable Stream                 │
│  ┌────────────────────────────────┐  │
│  │   Internal Buffer              │  │
│  │   (highWaterMark: 16KB)        │  │
│  │                                │  │
│  │   [data][data][data][data]     │  │
│  └────────────────────────────────┘  │
│           ↓                          │
│      write() returns false           │
│      when buffer ≥ highWaterMark     │
└──────────────────────────────────────┘
```

```javascript
const { Writable } = require('stream');

const writable = new Writable({
  highWaterMark: 16 * 1024,  // 16KB buffer
  write(chunk, encoding, callback) {
    console.log(`Writing ${chunk.length} bytes`);
    // Simulate slow I/O
    setTimeout(callback, 100);
  }
});

// Check buffer status
for (let i = 0; i < 100; i++) {
  const canWrite = writable.write(Buffer.alloc(1024));
  if (!canWrite) {
    console.log(`Buffer full at iteration ${i}`);
    break;
  }
}
```

### Closing Writable Streams

```javascript
const writable = fs.createWriteStream('file.txt');

// Method 1: end() - graceful close
writable.write('Data 1\n');
writable.write('Data 2\n');
writable.end('Final data\n');  // Writes and closes

// Method 2: destroy() - immediate close
writable.destroy();  // Abrupt termination

// Method 3: destroy() with error
writable.destroy(new Error('Something went wrong'));
```

### States of Writable Stream

```
┌────────────┐
│  Writable  │  ← Initial state
└─────┬──────┘
      │
      │ .write()
      ▼
┌────────────┐
│  Writing   │  ← Data being written
└─────┬──────┘
      │
      │ .end()
      ▼
┌────────────┐
│  Ending    │  ← Finishing up
└─────┬──────┘
      │
      │ 'finish' event
      ▼
┌────────────┐
│   Ended    │  ← Cannot write anymore
└────────────┘
```

### Piping Streams

**pipe()** connects readable stream to writable stream, handling backpressure automatically.

```javascript
const fs = require('fs');

// Simple pipe
const readable = fs.createReadStream('input.txt');
const writable = fs.createWriteStream('output.txt');

readable.pipe(writable);

// Chaining pipes
const zlib = require('zlib');

fs.createReadStream('file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('file.txt.gz'));

// Error handling in pipes
readable
  .on('error', (err) => console.error('Read error:', err))
  .pipe(writable)
  .on('error', (err) => console.error('Write error:', err));
```

### Pipeline (Better than pipe)

**pipeline()** properly handles errors and cleanup:

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);

// With promises
const { pipeline } = require('stream/promises');

async function compressFile() {
  await pipeline(
    fs.createReadStream('input.txt'),
    zlib.createGzip(),
    fs.createWriteStream('input.txt.gz')
  );
  console.log('Compression complete');
}

compressFile().catch(console.error);
```

### Duplex Streams

Duplex streams are both readable and writable (independent).

```javascript
const { Duplex } = require('stream');

const duplex = new Duplex({
  read(size) {
    this.push('Data from readable side\n');
    this.push(null);  // End reading
  },
  
  write(chunk, encoding, callback) {
    console.log('Writing:', chunk.toString());
    callback();
  }
});

// Use both sides
duplex.on('data', (chunk) => {
  console.log('Read:', chunk.toString());
});

duplex.write('Data to writable side\n');
duplex.end();

// Pipe readable side of duplex into stdout
duplex.pipe(process.stdout);
```

### Transform Streams

Transform streams modify data as it passes through.

```javascript
const { Transform } = require('stream');

const upperCaseTransform = new Transform({
  transform(chunk, encoding, callback) {
    const upper = chunk.toString().toUpperCase();
    this.push(upper);
    callback();
  }
});

process.stdin
  .pipe(upperCaseTransform)
  .pipe(process.stdout);
```

### PassThrough Streams

PassThrough streams are Transform streams that simply pass data along (useful for debugging).

```javascript
const { PassThrough } = require('stream');

const pass = new PassThrough();
pass.on('data', (chunk) => {
  console.log(`PassThrough saw: ${chunk.toString()}`);
});

process.stdin.pipe(pass).pipe(process.stdout);
```

### Opening Files with File Descriptors

```javascript
const fs = require('fs/promises');

async function copyUsingFD(src, dest) {
  const readHandle = await fs.open(src, 'r');
  const writeHandle = await fs.open(dest, 'w');
  
  const buffer = Buffer.alloc(64 * 1024);
  let bytesRead = 0;
  
  do {
    const { bytesRead: br } = await readHandle.read(buffer, 0, buffer.length, null);
    bytesRead = br;
    if (bytesRead > 0) {
      await writeHandle.write(buffer, 0, bytesRead);
    }
  } while (bytesRead > 0);
  
  await readHandle.close();
  await writeHandle.close();
}

copyUsingFD('input.txt', 'output.txt');
```

### Streams in the Browser (Fetch + ReadableStream)

```javascript
async function streamFetch(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(decoder.decode(value, { stream: true }));
  }
}

streamFetch('/large-file.txt');
```

---

## 9. Computer Networking Fundamentals

### OSI Model (Conceptual Layers)

```
┌───────────────┐
│ 7 Application │  (HTTP, FTP, DNS, SMTP)
├───────────────┤
│ 6 Presentation│  (SSL/TLS, data formats)
├───────────────┤
│ 5 Session     │  (RPC, NetBIOS)
├───────────────┤
│ 4 Transport   │  (TCP, UDP)
├───────────────┤
│ 3 Network     │  (IP, ICMP, routing)
├───────────────┤
│ 2 Data Link   │  (Ethernet, Wi-Fi, MAC)
├───────────────┤
│ 1 Physical    │  (Cables, radio, bits)
└───────────────┘
```

### TCP/IP Model (Practical Stack)

```
┌─────────────────────┐
│ Application         │  HTTP, HTTPS, FTP, DNS, SSH
├─────────────────────┤
│ Transport           │  TCP (reliable), UDP (fast)
├─────────────────────┤
│ Internet            │  IP, ICMP
├─────────────────────┤
│ Network Interface   │  Ethernet, Wi-Fi, drivers
└─────────────────────┘
```

### DNS Workflow

```
Client → Local Resolver → Root Server → TLD (.com) → Authoritative Server
          │ (cache?)         │                 │             │
          └──────────────────────────────────────────────────┘
                      Final IP returned to client
```

**DNS Hijacking**: When an attacker redirects DNS queries to malicious IPs (mitigation: DNSSEC, DoH/DoT, trusted resolvers).

### Network Topologies

```
Star:        Bus:             Mesh:
   +        A──B──C        A──B
  / \                      |\ |
 B   C                    C─+─D
```

### Firewall Basics

```
┌───────────────┐    Allow?    ┌──────────────┐
│ Incoming Traffic│ ---------->│ Firewall Rules│
└───────────────┘              └─────┬────────┘
                                      │
                               ┌──────▼──────┐
                               │ Application │
                               └─────────────┘
```

Rules defined by source/destination IPs, ports, protocols (e.g., allow 443/TCP).

### SSH & Remote Terminal Flow

```
Local machine (ssh client) ──TLS/SSH tunnel──> Remote server (sshd)
            │                                     │
            └────────── Encrypted session ────────┘
```

Commands:

```bash
ssh user@server-ip
ssh -i key.pem ec2-user@ec2-xx.amazonaws.com
scp file.txt user@server:/path/
rsync -avz folder/ user@server:/path/
```

### Connecting Multiple SSH Servers (Jump Host)

```
Local → Bastion Host → Private Server
```

```bash
ssh -J user@bastion user@internal
# Or use ProxyCommand in ~/.ssh/config
```

### EC2 Hosting Flow (Web App + DB)

```
User → Route53 DNS → CloudFront/CDN → ALB → EC2 App → RDS (DB)
                         │                      │
                      Auto Scaling          Security Groups
```

---

## 10. Networking with Core Node.js Modules

### UDP (dgram)

```javascript
const dgram = require('dgram');

// UDP Server
const server = dgram.createSocket('udp4');
server.on('message', (msg, rinfo) => {
  console.log(`Server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});
server.bind(41234);

// UDP Client
const client = dgram.createSocket('udp4');
client.send('Hello UDP', 41234, 'localhost', () => {
  client.close();
});
```

### TCP (net)

```javascript
const net = require('net');

const tcpServer = net.createServer((socket) => {
  console.log('Client connected');
  socket.write('Welcome!\n');
  socket.on('data', (data) => {
    console.log('Client says:', data.toString());
  });
});

tcpServer.listen(3001, () => console.log('TCP server on 3001'));
```

### Handling Multiple TCP Clients

```javascript
const clients = new Set();

tcpServer.on('connection', (socket) => {
  clients.add(socket);
  socket.on('end', () => clients.delete(socket));
});
```

### File Transfer (TCP)

```javascript
// Sender
fs.createReadStream('video.mp4').pipe(socket);

// Receiver
const writeStream = fs.createWriteStream('copy.mp4');
socket.pipe(writeStream);
```

### HTTP Headers & Rate Control

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ status: 'ok' }));
});
```

**Throttle data:**

```javascript
const { Readable } = require('stream');

class SlowStream extends Readable {
  constructor(data) {
    super();
    this.data = data;
  }
  _read() {
    if (!this.data.length) return this.push(null);
    const chunk = this.data.shift();
    setTimeout(() => this.push(chunk), 200); // 200ms per chunk
  }
}
```

### HTTP Client (core)

```javascript
const https = require('https');

https.get('https://api.github.com', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});
```

---

## 11. Express.js & REST APIs

### Project Layout

```
src/
  index.js
  routes/
    users.js
  controllers/
  middlewares/
  services/
```

### Basic Server

```javascript
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(4000, () => console.log('API running'));
```

### File Storage & Uploads (multer)

```javascript
const multer = require('multer');
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('avatar'), (req, res) => {
  res.json({ file: req.file });
});
```

Flow:

```
Client -> POST /upload -> Multer middleware -> Disk -> Controller -> Response
```

### Dynamic Routing

```javascript
app.get('/projects/:projectId/versions/:versionId', (req, res) => {
  const { projectId, versionId } = req.params;
  res.json({ projectId, versionId });
});
```

### CORS & Preflight

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://app.example.com'],
  credentials: true,
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));
```

Preflight flow (OPTIONS request) handled automatically by `cors` middleware.

### Path Traversal Prevention

```javascript
const path = require('path');

app.get('/download/:filename', (req, res) => {
  const safePath = path.join(__dirname, 'files', path.basename(req.params.filename));
  res.download(safePath);
});
```

### REST API Principles

1. Resources named via nouns (`/users`, `/projects/:id`)
2. HTTP methods define action
3. Use proper status codes
4. Stateless, cache-friendly
5. Hypermedia links optional (HATEOAS)

### Cookies & Sessions

```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser('secret'));

app.post('/login', (req, res) => {
  res.cookie('sessionId', 'abc123', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({ message: 'Logged in' });
});
```

### Router.param()

```javascript
const router = express.Router();

router.param('userId', async (req, res, next, id) => {
  req.user = await User.findById(id);
  if (!req.user) return res.status(404).send('User not found');
  next();
});

router.get('/users/:userId', (req, res) => {
  res.json(req.user);
});
```

### HTTP Redirection

```javascript
app.get('/old-route', (req, res) => {
  res.redirect(301, '/new-route');
});
```

---

## 12. Authentication & Authorization

### Hashing & Bcrypt

```javascript
const bcrypt = require('bcryptjs');

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);

const isMatch = await bcrypt.compare(password, hash);
```

Diagram:

```
Password -> +Salt -> Hash (store)
                    │
Login password -> +same salt -> Hash -> compare
```

### Signing Cookies

```javascript
res.cookie('session', 'value', {
  signed: true,
  httpOnly: true,
  secure: true
});
```

### JSON Web Tokens (JWT)

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: user._id, roles: user.roles },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const payload = jwt.verify(token, process.env.JWT_SECRET);
```

Structure:

```
Header.Payload.Signature
```

### Stateful vs Stateless

| Aspect | Stateful Session | Stateless JWT |
|--------|------------------|---------------|
| Storage | Server memory/DB | Client token |
| Scalability | Needs shared store | Easy horizontal scale |
| Revocation | Easy | Hard (need blacklist) |

### Restrict Multiple Devices

```
user_sessions table:
 userId | deviceId | token | lastSeen | revoked
```

Check active sessions count before issuing new ones.

### Auto Deleting Documents (TTL in MongoDB)

```javascript
db.collection('tokens').createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
);
```

### Google OAuth Flow (High-level)

```
Client → Google Auth URL → Consent Screen → Redirect URI (backend) → Exchange code for tokens → Fetch profile → Issue session/JWT
```

Key endpoints:

```
GET https://accounts.google.com/o/oauth2/v2/auth?client_id=...
POST https://oauth2.googleapis.com/token
```

### Token Expiry & Refresh

```
Access Token (short lived)
Refresh Token (long lived)

Client stores both securely. When access token expires:
Client → POST /auth/refresh (send refresh token) → Server verifies & issues new access token.
```

### RBAC (Role-Based Access Control)

```javascript
const roles = {
  admin: ['read:any', 'write:any'],
  editor: ['read:any', 'write:own'],
  viewer: ['read:any']
};

function authorize(requiredPermission) {
  return (req, res, next) => {
    const userPermissions = roles[req.user.role] || [];
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

app.delete('/projects/:id', authorize('write:any'), handler);
```

### Full Auth Flow Diagram

```
┌────────────┐      ┌──────────────┐      ┌──────────────┐
│   Client   │ ---> │ Auth Server  │ ---> │ Resource API │
└────────────┘      └──────────────┘      └──────────────┘
      |                    |                    |
      |--- Credentials --->|                    |
      |<-- Tokens (JWT) ---|                    |
      |--- Authorization Header with JWT -----> |
      |<-- Protected Data --------------------- |
```

---

Next Steps:
- Add deep dives for remaining topics like advanced networking, CRUD patterns, and detailed security playbooks as needed.


itable side\n');
duplex.end();

// Example: TCP socket is a duplex stream
const net = require('net');
const socket = net.connect(3000, 'localhost');

// Write to socket
socket.write('Hello Server');

// Read from socket
socket.on('data', (data) => {
  console.log('Received:', data.toString());
});
```

### Transform Streams

Transform streams modify data as it passes through.

```javascript
const { Transform } = require('stream');

// Create uppercase transform
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    // Transform data
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

// Usage
process.stdin
  .pipe(upperCase)
  .pipe(process.stdout);

// Custom transform: CSV to JSON
class CSVToJSON extends Transform {
  constructor(options) {
    super(options);
    this.headers = null;
    this.buffer = '';
  }

  transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep incomplete line

    lines.forEach((line) => {
      if (!this.headers) {
        this.headers = line.split(',');
      } else {
        const values = line.split(',');
        const obj = {};
        this.headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        this.push(JSON.stringify(obj) + '\n');
      }
    });

    callback();
  }

  flush(callback) {
    // Process remaining buffer
    if (this.buffer) {
      const values = this.buffer.split(',');
      const obj = {};
      this.headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      this.push(JSON.stringify(obj) + '\n');
    }
    callback();
  }
}

// Usage
const fs = require('fs');
fs.createReadStream('data.csv')
  .pipe(new CSVToJSON())
  .pipe(fs.createWriteStream('data.json'));
```

### PassThrough Streams

PassThrough streams pass data through unchanged (useful for monitoring/logging).

```javascript
const { PassThrough } = require('stream');
const fs = require('fs');

const passThrough = new PassThrough();

// Monitor data flowing through
passThrough.on('data', (chunk) => {
  console.log(`Passing through ${chunk.length} bytes`);
});

fs.createReadStream('input.txt')
  .pipe(passThrough)
  .pipe(fs.createWriteStream('output.txt'));

// Multiple destinations
const readable = fs.createReadStream('file.txt');
const writable1 = fs.createWriteStream('copy1.txt');
const writable2 = fs.createWriteStream('copy2.txt');

readable.pipe(writable1);
readable.pipe(writable2);
```

### Data Streams (stdin, stdout, stderr)

```javascript
// stdin - Standard Input (Readable)
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  console.log(`You typed: ${chunk}`);
});

// stdout - Standard Output (Writable)
process.stdout.write('Hello World\n');
console.log('Hello'); // Uses stdout internally

// stderr - Standard Error (Writable)
process.stderr.write('Error message\n');
console.error('Error'); // Uses stderr internally

// Piping stdin to stdout (echo program)
process.stdin.pipe(process.stdout);
```

### Piping and Redirection in Shell

```bash
# Pipe stdout of cmd1 to stdin of cmd2
ls -l | grep ".txt"

# Redirect stdout to file
echo "Hello" > output.txt

# Append stdout to file
echo "World" >> output.txt

# Redirect stderr to file
command 2> error.log

# Redirect both stdout and stderr
command > output.log 2>&1

# Pipe to multiple commands
cat file.txt | grep "pattern" | sort | uniq

# Use tee to split output
ls -l | tee output.txt | grep ".txt"
```

### Opening Files in Different Modes

```javascript
const fs = require('fs');

// File flags (modes)
// 'r'  - Read (file must exist)
// 'r+' - Read/Write (file must exist)
// 'w'  - Write (creates/truncates file)
// 'w+' - Read/Write (creates/truncates file)
// 'a'  - Append (creates if doesn't exist)
// 'a+' - Read/Append (creates if doesn't exist)
// 'x'  - Exclusive create (fails if exists)

fs.open('file.txt', 'r', (err, fd) => {
  if (err) throw err;
  
  // Read using file descriptor
  const buffer = Buffer.alloc(100);
  fs.read(fd, buffer, 0, 100, 0, (err, bytesRead) => {
    console.log(buffer.toString('utf8', 0, bytesRead));
    fs.close(fd, (err) => {
      if (err) throw err;
    });
  });
});

// Write using file descriptor
fs.open('output.txt', 'w', (err, fd) => {
  if (err) throw err;
  
  const data = Buffer.from('Hello World');
  fs.write(fd, data, 0, data.length, 0, (err, written) => {
    console.log(`Wrote ${written} bytes`);
    fs.close(fd, (err) => {
      if (err) throw err;
    });
  });
});
```

### Handling Files with Promises

```javascript
const fs = require('fs').promises;

// Read file
async function readFile() {
  try {
    const data = await fs.readFile('file.txt', 'utf8');
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

// Write file
async function writeFile() {
  try {
    await fs.writeFile('output.txt', 'Hello World');
    console.log('File written');
  } catch (err) {
    console.error(err);
  }
}

// Using file handle
async function useFileHandle() {
  let fileHandle;
  try {
    fileHandle = await fs.open('file.txt', 'r');
    const data = await fileHandle.readFile('utf8');
    console.log(data);
  } finally {
    await fileHandle?.close();
  }
}

// Stream with promises
const { pipeline } = require('stream/promises');

async function compressFile() {
  const { createReadStream, createWriteStream } = require('fs');
  const { createGzip } = require('zlib');
  
  await pipeline(
    createReadStream('input.txt'),
    createGzip(),
    createWriteStream('input.txt.gz')
  );
}
```

### Streams in Browsers (Web Streams API)

```javascript
// Fetch API uses streams
fetch('https://example.com/large-file.json')
  .then(response => {
    const reader = response.body.getReader();
    
    function read() {
      return reader.read().then(({ done, value }) => {
        if (done) {
          console.log('Stream complete');
          return;
        }
        
        console.log(`Received ${value.length} bytes`);
        return read();
      });
    }
    
    return read();
  });

// ReadableStream
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue('Hello ');
    controller.enqueue('World');
    controller.close();
  }
});

const reader = stream.getReader();

function read() {
  reader.read().then(({ done, value }) => {
    if (done) {
      console.log('Done');
      return;
    }
    console.log(new TextDecoder().decode(value));
    read();
  });
}

read();

// WritableStream
const writableStream = new WritableStream({
  write(chunk) {
    console.log('Writing:', new TextDecoder().decode(chunk));
  },
  close() {
    console.log('Stream closed');
  }
});

const writer = writableStream.getWriter();
writer.write(new TextEncoder().encode('Hello'));
writer.close();

// TransformStream
const transformStream = new TransformStream({
  transform(chunk, controller) {
    // Convert to uppercase
    const text = new TextDecoder().decode(chunk);
    controller.enqueue(
      new TextEncoder().encode(text.toUpperCase())
    );
  }
});

fetch('https://example.com/data.txt')
  .then(response => response.body
    .pipeThrough(transformStream)
    .pipeTo(writableStream)
  );
```

---

## 9. Computer Networking Fundamentals

### IP Address (Internet Protocol)

**IPv4**: 32-bit address (4 octets)
```
192.168.1.1
│   │   │ │
│   │   │ └─ 4th octet (0-255)
│   │   └─── 3rd octet
│   └─────── 2nd octet
└─────────── 1st octet

Binary: 11000000.10101000.00000001.00000001
```

**IPv6**: 128-bit address (8 groups of 4 hex digits)
```
2001:0db8:85a3:0000:0000:8a2e:0370:7334
│    │    │    │    │    │    │    │
└────┴────┴────┴────┴────┴────┴────┴─── 8 groups
```

**Special IP Addresses:**
```
127.0.0.1      → Localhost (loopback)
0.0.0.0        → All interfaces
192.168.x.x    → Private network (Class C)
10.x.x.x       → Private network (Class A)
172.16-31.x.x  → Private network (Class B)
```

### Domain Name System (DNS)

DNS translates domain names to IP addresses.

```
┌──────────────────────────────────────────┐
│  1. User types: www.example.com          │
└───────────────┬──────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│  2. Browser checks cache                   │
│     → Local cache                          │
│     → OS cache                             │
│     → Router cache                         │
└───────────────┬────────────────────────────┘
                │ (if not found)
                ▼
┌────────────────────────────────────────────┐
│  3. Query DNS Resolver (ISP)               │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│  4. Query Root DNS Server                  │
│     → Returns .com TLD server              │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│  5. Query TLD DNS Server (.com)            │
│     → Returns example.com nameserver       │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│  6. Query Authoritative DNS Server         │
│     → Returns IP: 93.184.216.34           │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│  7. Browser connects to 93.184.216.34      │
└────────────────────────────────────────────┘
```

```javascript
const dns = require('dns');

// Resolve domain to IP
dns.resolve4('google.com', (err, addresses) => {
  console.log(addresses); // ['142.250.185.46']
});

// Reverse lookup (IP to domain)
dns.reverse('8.8.8.8', (err, hostnames) => {
  console.log(hostnames); // ['dns.google']
});

// DNS lookup
dns.lookup('google.com', (err, address, family) => {
  console.log(address);  // '142.250.185.46'
  console.log(family);   // 4 (IPv4) or 6 (IPv6)
});

// With promises
const dnsPromises = dns.promises;

async function resolveDomain() {
  const addresses = await dnsPromises.resolve4('example.com');
  console.log(addresses);
}
```

### DNS Hijacking

**DNS Hijacking**: Redirecting DNS queries to malicious servers.

```
Normal:
User → Legitimate DNS → Correct IP → Legitimate Site

Hijacked:
User → Malicious DNS → Fake IP → Phishing Site
```

**Protection:**
- Use secure DNS (DNS over HTTPS/TLS)
- Use trusted DNS servers (Google: 8.8.8.8, Cloudflare: 1.1.1.1)
- Enable DNSSEC

### Network Interfaces

```javascript
const os = require('os');

// Get network interfaces
const interfaces = os.networkInterfaces();

console.log(interfaces);
// {
//   eth0: [
//     {
//       address: '192.168.1.100',
//       netmask: '255.255.255.0',
//       family: 'IPv4',
//       mac: '00:1B:44:11:3A:B7',
//       internal: false
//     }
//   ],
//   lo: [
//     {
//       address: '127.0.0.1',
//       netmask: '255.0.0.0',
//       family: 'IPv4',
//       internal: true
//     }
//   ]
// }

// Get local IP
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
}

console.log(getLocalIP()); // '192.168.1.100'
```

### Firewall

A firewall controls incoming/outgoing network traffic based on security rules.

```
┌─────────────────────────────────────┐
│         Internet                    │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│          Firewall                   │
│  ┌───────────────────────────────┐  │
│  │  Rules:                       │  │
│  │  - Allow port 80 (HTTP)       │  │
│  │  - Allow port 443 (HTTPS)     │  │
│  │  - Block port 22 (SSH)        │  │
│  │  - Allow specific IPs         │  │
│  └───────────────────────────────┘  │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      Internal Network               │
└─────────────────────────────────────┘
```

### OSI Model (7 Layers)

```
┌─────────────────────────────────────┐
│  7. Application  (HTTP, FTP, DNS)   │  User applications
├─────────────────────────────────────┤
│  6. Presentation (SSL, Encryption)  │  Data formatting
├─────────────────────────────────────┤
│  5. Session      (Sessions, Auth)   │  Connection management
├─────────────────────────────────────┤
│  4. Transport    (TCP, UDP)         │  End-to-end delivery
├─────────────────────────────────────┤
│  3. Network      (IP, Routing)      │  Logical addressing
├─────────────────────────────────────┤
│  2. Data Link    (MAC, Ethernet)    │  Physical addressing
├─────────────────────────────────────┤
│  1. Physical     (Cables, Signals)  │  Raw bit transmission
└─────────────────────────────────────┘
```

### TCP/IP Model (4 Layers)

Simplified, practical model used on the Internet:

```
┌─────────────────────────────────────┐
│  Application  (HTTP, FTP, SSH, DNS) │  OSI: 5-7
├─────────────────────────────────────┤
│  Transport    (TCP, UDP)            │  OSI: 4
├─────────────────────────────────────┤
│  Internet     (IP, ICMP, ARP)       │  OSI: 3
├─────────────────────────────────────┤
│  Network      (Ethernet, Wi-Fi)     │  OSI: 1-2
└─────────────────────────────────────┘
```

### Network Topologies

**1. Star Topology:**
```
        ┌───┐
    ┌───│ C │
    │   └───┘
┌───▼───┐
│ Hub/  │
│Switch │
└───┬───┘
    │   ┌───┐
    ├───│ C │
    │   └───┘
    │   ┌───┐
    └───│ C │
        └───┘
```

**2. Bus Topology:**
```
┌───┐   ┌───┐   ┌───┐   ┌───┐
│ C │───│ C │───│ C │───│ C │
└───┘   └───┘   └───┘   └───┘
        Main Cable
```

**3. Ring Topology:**
```
    ┌───┐
    │ C │
    └─┬─┘
  ┌───▼───┐
┌─┤ C     │
│ └───────┘
│   ┌───┐
└───│ C │
    └───┘
```

**4. Mesh Topology:**
```
┌───┐────┌───┐
│ C │────│ C │
└─┬─┘────└─┬─┘
  │   ╱╲   │
  │  ╱  ╲  │
  │ ╱    ╲ │
┌─▼─┐────┌▼┴┐
│ C │────│ C │
└───┘    └───┘
```

### TCP vs UDP

**TCP (Transmission Control Protocol)**:
- Connection-oriented
- Reliable (guaranteed delivery)
- Ordered packets
- Error checking
- Flow control
- Slower

**UDP (User Datagram Protocol)**:
- Connectionless
- Unreliable (best-effort)
- No packet ordering
- Minimal error checking
- No flow control
- Faster

```
TCP Handshake (3-way):
Client                    Server
  │                         │
  ├──── SYN ────────────────>│
  │                         │
  │<──── SYN-ACK ───────────┤
  │                         │
  ├──── ACK ────────────────>│
  │                         │
  │    Connection Established
  
UDP:
Client                    Server
  │                         │
  ├──── Data ──────────────>│
  │                         │
  ├──── Data ──────────────>│
  │   (No acknowledgment)   │
```

**Use Cases:**
```
TCP: HTTP, HTTPS, FTP, SSH, Email
UDP: Video streaming, Gaming, VoIP, DNS
```

### Ports

Ports identify specific applications/services on a host.

```
Port Range:
0-1023     → Well-known ports (system/privileged)
1024-49151 → Registered ports (user applications)
49152-65535→ Dynamic/private ports

Common Ports:
20, 21  → FTP
22      → SSH
23      → Telnet
25      → SMTP (Email)
53      → DNS
80      → HTTP
443     → HTTPS
3000    → Node.js dev server (convention)
3306    → MySQL
5432    → PostgreSQL
6379    → Redis
27017   → MongoDB
```

### SSH (Secure Shell)

Secure protocol for remote terminal access.

```bash
# Connect to remote server
ssh user@hostname

# With specific port
ssh -p 2222 user@hostname

# With key authentication
ssh -i ~/.ssh/id_rsa user@hostname

# Execute command remotely
ssh user@hostname 'ls -la'

# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to server
ssh-copy-id user@hostname

# SSH config file (~/.ssh/config)
Host myserver
    HostName 192.168.1.100
    User admin
    Port 22
    IdentityFile ~/.ssh/id_rsa

# Usage: ssh myserver
```

### Transferring Files with SCP

```bash
# Copy file to remote server
scp local_file.txt user@hostname:/remote/path/

# Copy file from remote server
scp user@hostname:/remote/file.txt ./local_path/

# Copy directory recursively
scp -r local_directory/ user@hostname:/remote/path/

# With specific port
scp -P 2222 file.txt user@hostname:/path/

# With progress and compression
scp -v -C file.txt user@hostname:/path/
```

### Connecting Multiple SSH Servers (SSH Tunneling)

```bash
# Port forwarding (Local)
ssh -L local_port:destination:destination_port user@gateway

# Example: Access internal database through gateway
ssh -L 5432:internal-db:5432 user@gateway
# Now connect to localhost:5432 to reach internal-db:5432

# Port forwarding (Remote)
ssh -R remote_port:localhost:local_port user@server

# Dynamic port forwarding (SOCKS proxy)
ssh -D 8080 user@server
# Configure browser to use SOCKS proxy localhost:8080

# Jump/Bastion host
ssh -J gateway user@internal-server

# Multiple jumps
ssh -J gateway1,gateway2 user@final-server
```

### EC2 Instance Flow

```
┌────────────────────────────────────┐
│  1. Launch EC2 Instance (AWS)      │
│     - Choose AMI (Amazon Linux)    │
│     - Select instance type (t2.micro)│
│     - Configure security group     │
│     - Create/assign key pair       │
└───────────────┬────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│  2. Connect via SSH                │
│     ssh -i key.pem ec2-user@IP     │
└───────────────┬────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│  3. Install Dependencies           │
│     sudo yum update                │
│     sudo yum install -y nodejs     │
│     sudo yum install -y mongodb    │
└───────────────┬────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│  4. Configure Security Group       │
│     - Allow port 22 (SSH)          │
│     - Allow port 80 (HTTP)         │
│     - Allow port 443 (HTTPS)       │
│     - Allow port 27017 (MongoDB)   │
└───────────────┬────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│  5. Deploy Application             │
│     - Clone repository             │
│     - Install packages (npm install)│
│     - Start application            │
└───────────────┬────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│  6. Access Database                │
│     - Locally: mongodb://localhost │
│     - Or use managed RDS/DocumentDB│
└────────────────────────────────────┘
```

---

## 10. HTTP & Web Servers

### Socket

A **socket** is an endpoint for network communication.

```
┌─────────────────────────────────────┐
│         Application                 │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│          Socket API                 │
│  (IP Address + Port Number)         │
│  Example: 192.168.1.100:3000        │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│       TCP/UDP Protocol              │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         Network                     │
└─────────────────────────────────────┘
```

### Creating UDP Server

```javascript
const dgram = require('dgram');

// Create UDP server
const server = dgram.createSocket('udp4');

server.on('listening', () => {
  const address = server.address();
  console.log(`UDP server listening on ${address.address}:${address.port}`);
});

server.on('message', (msg, rinfo) => {
  console.log(`Received: ${msg} from ${rinfo.address}:${rinfo.port}`);
  
  // Send response
  server.send('Hello Client', rinfo.port, rinfo.address);
});

server.on('error', (err) => {
  console.error(`Server error: ${err.stack}`);
  server.close();
});

server.bind(41234);  // Listen on port 41234
```

### Transferring Files with UDP

```javascript
const dgram = require('dgram');
const fs = require('fs');

// UDP File Server
const server = dgram.createSocket('udp4');
const CHUNK_SIZE = 1024;

server.on('message', (msg, rinfo) => {
  const filename = msg.toString();
  
  fs.readFile(filename, (err, data) => {
    if (err) {
      server.send('ERROR', rinfo.port, rinfo.address);
      return;
    }
    
    // Send file in chunks
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      server.send(chunk, rinfo.port, rinfo.address);
    }
    
    // Send end marker
    server.send('EOF', rinfo.port, rinfo.address);
  });
});

server.bind(41234);

// UDP File Client
const client = dgram.createSocket('udp4');
const chunks = [];

client.on('message', (msg) => {
  const data = msg.toString();
  
  if (data === 'EOF') {
    const fileData = Buffer.concat(chunks);
    fs.writeFileSync('received_file.txt', fileData);
    console.log('File received');
    client.close();
  } else if (data === 'ERROR') {
    console.error('File not found');
    client.close();
  } else {
    chunks.push(msg);
  }
});

// Request file
client.send('file.txt', 41234, 'localhost');
```

### Creating TCP Server

```javascript
const net = require('net');

// Create TCP server
const server = net.createServer((socket) => {
  console.log('Client connected');
  
  // Handle data
  socket.on('data', (data) => {
    console.log(`Received: ${data}`);
    socket.write(`Echo: ${data}`);
  });
  
  // Handle end
  socket.on('end', () => {
    console.log('Client disconnected');
  });
  
  // Handle error
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(8080, () => {
  console.log('TCP server listening on port 8080');
});
```

### Handling Multiple TCP Clients

```javascript
const net = require('net');

const clients = [];

const server = net.createServer((socket) => {
  // Add client
  clients.push(socket);
  console.log(`Client ${clients.length} connected`);
  
  // Broadcast to all clients
  function broadcast(message, sender) {
    clients.forEach((client) => {
      if (client !== sender && !client.destroyed) {
        client.write(message);
      }
    });
  }
  
  // Handle data
  socket.on('data', (data) => {
    console.log(`Client: ${data}`);
    broadcast(data, socket);
  });
  
  // Handle disconnect
  socket.on('end', () => {
    const index = clients.indexOf(socket);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    console.log(`Client disconnected. ${clients.length} remaining`);
  });
  
  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

server.listen(8080);
```

### Transferring Files with TCP

```javascript
const net = require('net');
const fs = require('fs');

// TCP File Server
const server = net.createServer((socket) => {
  let filename = '';
  
  socket.once('data', (data) => {
    filename = data.toString();
    console.log(`Client requested: ${filename}`);
    
    const readStream = fs.createReadStream(filename);
    
    readStream.on('data', (chunk) => {
      socket.write(chunk);
    });
    
    readStream.on('end', () => {
      socket.end();
      console.log('File sent');
    });
    
    readStream.on('error', (err) => {
      socket.write(`ERROR: ${err.message}`);
      socket.end();
    });
  });
});

server.listen(8080, () => {
  console.log('File server listening on port 8080');
});

// TCP File Client
const client = net.createConnection({ port: 8080 }, () => {
  console.log('Connected to server');
  client.write('file.txt');  // Request file
});

const writeStream = fs.createWriteStream('downloaded_file.txt');

client.on('data', (data) => {
  writeStream.write(data);
});

client.on('end', () => {
  writeStream.end();
  console.log('File downloaded');
});
```

### HTTP Headers

HTTP headers provide metadata about requests and responses.

**Request Headers:**
```
GET /api/users HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept: application/json
Accept-Language: en-US,en;q=0.9
Accept-Encoding: gzip, deflate
Connection: keep-alive
Cookie: session=abc123
Authorization: Bearer token123
Content-Type: application/json
Content-Length: 123
```

**Response Headers:**
```
HTTP/1.1 200 OK
Date: Mon, 17 Nov 2025 12:00:00 GMT
Server: nginx/1.20.1
Content-Type: application/json
Content-Length: 456
Cache-Control: max-age=