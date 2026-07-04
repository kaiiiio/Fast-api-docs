# Streams and Backpressure - Senior Interview Deep Dive

Streams are the most misunderstood core API in Node.js, and stream questions are a reliable way for interviewers to separate engineers who have shipped high-throughput data pipelines from those who have only read blog posts. This file covers the four stream classes and their internal state machines, `highWaterMark` mechanics, the backpressure protocol, the pipe/pipeline/async-iterator trade-offs, and the production failure modes (memory blowups, swallowed errors, leaked file descriptors) that show up in real systems.

---

### Q1. What are the four stream classes and what do they actually model internally?

**Answer:**
Every stream in Node is a state machine wrapped around an internal buffer (a linked list, `BufferList`, not an array — appends and shifts are O(1)):

- **Readable** — a *pull-based source* with an internal read buffer. Data enters via `this.push(chunk)` inside `_read()`, and leaves via `stream.read()` or `'data'` events. It has two modes: **paused** (you call `read()`) and **flowing** (data is emitted as fast as it arrives).
- **Writable** — a *sink* with an internal write buffer. `write(chunk)` enqueues; the machinery calls your `_write(chunk, enc, cb)` one chunk at a time (or `_writev` for batches when the buffer has queued up).
- **Duplex** — independent Readable + Writable sides sharing one object (e.g., `net.Socket`: the readable side is bytes from the peer, the writable side is bytes to the peer). The two sides have *separate buffers and separate highWaterMarks*.
- **Transform** — a Duplex where the sides are causally linked: `_transform(chunk, enc, cb)` receives writes and `this.push()`es reads. `zlib.createGzip()`, `crypto.createCipheriv()` are Transforms.

The key internal objects are `stream._readableState` and `stream._writableState`. Knowing a few of their fields is a strong interview signal:

```js
const { Readable } = require('stream');

const r = new Readable({ read() {} });
r.push(Buffer.alloc(1000));

console.log(r._readableState.length);        // 1000 — bytes buffered
console.log(r._readableState.highWaterMark); // 65536 — default 64 KiB for byte streams
console.log(r._readableState.flowing);       // null — neither paused nor flowing yet
r.on('data', () => {});
console.log(r._readableState.flowing);       // true — attaching 'data' switches to flowing mode
```

**Interview trap:** "Is a Duplex the same as a Transform?" No. A Duplex's sides are unrelated (socket). A Transform's output is a function of its input. If you implement a protocol parser as a Duplex when it should be a Transform, you re-implement the write→read plumbing (and usually get backpressure wrong).

---

### Q2. What exactly is `highWaterMark`? Is it a hard limit?

**Answer:**
`highWaterMark` (HWM) is a **soft threshold, not a cap**. It is the point at which the stream starts *signaling* backpressure — it never rejects data.

- **Readable side:** `_read()` stops being called once the internal buffer's `length >= highWaterMark`. But if your `_read()` implementation keeps calling `push()` anyway, the buffer keeps growing — `push()` returning `false` is advice, not enforcement.
- **Writable side:** `write()` returns `false` once buffered bytes `>= highWaterMark`. The write is **still accepted and buffered**. If you ignore the `false`, the buffer grows without bound.

Defaults (know these numbers):

| Stream type | Default HWM | Unit |
|---|---|---|
| Byte streams (`Readable`/`Writable`) | 65536 (64 KiB) | bytes |
| Object mode streams | 16 | objects |
| `fs.createReadStream` | 65536 (64 KiB; was 64 KiB since v10, historically 16 KiB pre-v10 docs myth — check your version) | bytes |
| `net.Socket` | 65536 read / 65536 write | bytes |
| `zlib` streams | 65536 | bytes |

```js
const { Writable } = require('stream');

const w = new Writable({
  highWaterMark: 4,          // 4 bytes — absurdly small to demonstrate
  write(chunk, enc, cb) {
    setTimeout(cb, 100);     // slow consumer: 1 chunk per 100ms
  },
});

console.log(w.write('ab'));  // true  — 2 < 4
console.log(w.write('cd'));  // false — buffer now >= 4, backpressure signaled
console.log(w.write('ef'));  // false — STILL BUFFERED. Nothing is dropped.
console.log(w._writableState.length); // 6 — over the HWM. It's a threshold, not a cap.
```

**Interview trap:** "What happens if I `write()` after it returned false?" Nothing throws, nothing is dropped — the chunk is buffered and RSS grows. That's the whole bug class: backpressure in Node is *cooperative*. A producer that ignores `false` turns a 64 KiB buffer into an OOM.

---

### Q3. Walk through the backpressure protocol precisely. What does `write()` returning `false` mean, and what is `'drain'`?

**Answer:**
The contract between a fast producer and a slow consumer:

1. Producer calls `writable.write(chunk)`.
2. Stream buffers the chunk and (if not already writing) dispatches `_write()`.
3. `write()` returns `true` if `writableState.length < highWaterMark` after buffering, else `false`.
4. On `false`, the producer must **stop producing** and wait.
5. As `_write()` callbacks complete, buffered length falls. When it reaches **0** (not "below HWM" — it drains fully), the stream emits **`'drain'`** exactly once (only if `needDrain` was set, i.e., a `write()` had returned false).
6. Producer resumes on `'drain'`.

Manual implementation — this is the code interviewers want to see you write from memory:

```js
const fs = require('fs');

// Write 10 million lines without ever buffering more than ~HWM in memory.
async function writeHugeFile(path) {
  const out = fs.createWriteStream(path);

  const writeLine = (line) =>
    new Promise((resolve, reject) => {
      out.once('error', reject);
      if (out.write(line)) {
        out.removeListener('error', reject);
        resolve();                          // buffer has room — continue immediately
      } else {
        out.once('drain', () => {           // buffer full — wait for it to empty
          out.removeListener('error', reject);
          resolve();
        });
      }
    });

  for (let i = 0; i < 10_000_000; i++) {
    await writeLine(`row ${i}\n`);
  }
  await new Promise((res, rej) => out.end(res).once('error', rej));
}
```

Without the `'drain'` wait, this loop synchronously queues ~120 MB of strings before the event loop ever gets a chance to flush — with the wait, memory stays flat at ~64 KiB of buffer.

**Production war story:** A logging library wrote every log line with `socket.write()` and never checked the return value. Under an incident (log volume 100x), the TCP socket to the log collector backed up, the writable buffer absorbed everything, and the *logging library* OOM-killed the API servers — turning a downstream logging slowdown into a full outage. Fix: check `write()`'s return, and drop/sample logs when backpressured. Logs are the one place where dropping is correct.

---

### Q4. How does backpressure propagate through `readable.pipe(writable)` internally?

**Answer:**
`pipe()` wires four things together:

```js
// Simplified essence of what pipe() does internally:
src.on('data', (chunk) => {
  const ok = dest.write(chunk);
  if (!ok) src.pause();          // consumer is full — stop the producer
});
dest.on('drain', () => src.resume()); // consumer emptied — restart the producer
src.on('end', () => dest.end());      // propagate EOF
// NOTE: errors are NOT propagated — see Q10.
```

So backpressure propagation is: writable buffer hits HWM → `write()` returns false → pipe calls `src.pause()` → readable stops emitting `'data'` → readable's own buffer fills to *its* HWM → readable stops calling `_read()` → the ultimate source (fd read, socket) stops being pulled. For a TCP source, the kernel receive buffer then fills and TCP flow control (the receive window) pushes back on the remote peer. This is the beautiful part: Node stream backpressure composes with kernel-level TCP backpressure end to end.

In a chain `a.pipe(b).pipe(c)`, each link applies this independently, so a slow `c` throttles `a` with at most `HWM(b.writable) + HWM(b.readable) + HWM(c.writable)` bytes in flight per hop.

---

### Q5. Explain paused vs flowing mode, and the three ways a Readable switches between them.

**Answer:**
`readableState.flowing` has three values: `null` (initial — no consumer), `true` (flowing), `false` (explicitly paused).

Switch **to flowing**: attach a `'data'` listener, call `.resume()`, or call `.pipe(dest)`.
Switch **to paused**: call `.pause()`, or `.unpipe()` all destinations. Note: attaching a `'readable'` listener also takes the stream out of flowing (it sets flowing to `false` — `'readable'` wins over `'data'` if both are attached, which is a classic footgun).

```js
const { Readable } = require('stream');
const r = Readable.from(['a', 'b', 'c']);

// Paused-mode consumption: you pull explicitly.
r.on('readable', () => {
  let chunk;
  while ((chunk = r.read()) !== null) {   // drain everything available
    console.log('pulled:', chunk);
  }
});
r.on('end', () => console.log('done'));
```

**Interview trap:** mixing `'data'` and `'readable'` listeners on one stream. `'readable'` forces paused mode, so your `'data'` handler only fires for chunks you `read()` — code appears to "randomly lose data." Pick one consumption style per stream.

---

### Q6. Implement a Readable, a Writable, and a Transform from scratch with correct backpressure semantics.

**Answer:**

```js
const { Readable, Writable, Transform } = require('stream');

// READABLE: a counter source. _read() is the "pull" signal — push until
// push() returns false, then stop until _read() is called again.
class Counter extends Readable {
  constructor(max, opts) {
    super(opts);
    this.i = 0;
    this.max = max;
  }
  _read() {
    // Loop: push as much as the buffer will take. Stopping when push()
    // returns false is what makes this backpressure-correct.
    while (this.i < this.max) {
      const ok = this.push(Buffer.from(`${this.i++}\n`));
      if (!ok) return;         // buffer >= HWM; _read() will be called again later
    }
    this.push(null);           // EOF
  }
}

// WRITABLE: cb() is the backpressure valve. Do NOT call cb() before the
// async work finishes, or you disable backpressure entirely.
class SlowSink extends Writable {
  _write(chunk, enc, cb) {
    setTimeout(() => cb(), 5); // simulate slow I/O; cb(err) to signal failure
  }
  // Optional batch path: called with all queued chunks when the buffer backed up.
  _writev(chunks, cb) {
    setTimeout(() => cb(), 5);
  }
}

// TRANSFORM: split arbitrary byte chunks into lines. Must carry a remainder
// across chunks — chunk boundaries never align with record boundaries.
class LineSplitter extends Transform {
  constructor() {
    super({ readableObjectMode: true }); // bytes in, line-strings out
    this.remainder = '';
  }
  _transform(chunk, enc, cb) {
    const data = this.remainder + chunk.toString('utf8');
    const lines = data.split('\n');
    this.remainder = lines.pop();        // last piece may be an incomplete line
    for (const line of lines) this.push(line);
    cb();                                // ready for the next chunk
  }
  _flush(cb) {                           // called at EOF — emit the tail
    if (this.remainder) this.push(this.remainder);
    cb();
  }
}

new Counter(1000).pipe(new LineSplitter()).on('data', l => {}).on('end', () => console.log('ok'));
```

**Interview trap:** calling `cb()` in `_write` *before* the I/O completes ("fire and forget"). The stream thinks every write finished instantly, `write()` never returns false, and you have zero backpressure — the in-flight I/O queue grows unboundedly. The callback IS the backpressure mechanism.

---

### Q7. `pipe()` vs `stream.pipeline()` vs `for await...of` — when do you use each, and why is bare `pipe()` considered dangerous?

**Answer:**

| | `a.pipe(b)` | `pipeline(a, b, c, cb)` | `for await (const c of stream)` |
|---|---|---|---|
| Error propagation | **None** — errors don't cross links | All streams destroyed on any error | Throws into your try/catch |
| Cleanup on failure | Manual (`destroy()` each) | Automatic (calls `destroy()` on every stream) | Automatic for the source; you handle the sink |
| Premature close handling | Leaks the source | Handled | Handled |
| Backpressure | Yes | Yes | Yes (iterator `next()` is the pull) |
| Returns | Destination (chainable) | Promise (promises API) / cb | — |
| Use when | Never in prod, fine in REPL | Fixed pipelines, prod default | Per-chunk async logic, transforms in app code |

```js
const { pipeline } = require('stream/promises');
const fs = require('fs');
const zlib = require('zlib');

// Production default: pipeline. One error anywhere tears down everything
// and rejects the promise; no leaked fds, no half-open sockets.
await pipeline(
  fs.createReadStream('access.log'),
  zlib.createGzip(),
  fs.createWriteStream('access.log.gz'),
);

// Async iteration: backpressure via pull — await inside the loop naturally
// throttles the source, because the next chunk isn't read until you ask.
async function sumBytes(path) {
  let total = 0;
  for await (const chunk of fs.createReadStream(path)) {
    total += chunk.length;
    await someAsyncWork(chunk); // source is paused while this awaits — free backpressure
  }
  return total;
}
```

Since Node 17, `pipeline` also accepts async generators as middle stages, which is the cleanest way to write transforms:

```js
await pipeline(
  fs.createReadStream('in.csv'),
  async function* (source) {           // async generator as a Transform
    let rest = '';
    for await (const chunk of source) {
      const lines = (rest + chunk).split('\n');
      rest = lines.pop();
      for (const line of lines) yield line.toUpperCase() + '\n';
    }
    if (rest) yield rest.toUpperCase() + '\n';
  },
  fs.createWriteStream('out.csv'),
);
```

**Interview trap:** `pipeline` with a callback vs promises — mixing them. `require('stream').pipeline` takes a callback; `require('stream/promises').pipeline` returns a promise. Calling the callback version without a callback throws in newer Node versions.

---

### Q8. What is object mode? What changes internally, and what are the costs?

**Answer:**
`objectMode: true` switches the internal accounting from bytes to *item count*:

- The buffer holds arbitrary JS values (objects, strings kept as-is, anything except `null`, which still means EOF).
- `highWaterMark` counts **objects**, default **16**.
- No chunk concatenation/splitting — `read(n)` ignores `n` and returns one object.
- Duplex/Transform can be mixed: `readableObjectMode` / `writableObjectMode` independently (LineSplitter in Q6 does exactly this: bytes in, strings out).

Costs and gotchas:
- 16 objects of unknown size is a meaningless memory bound. 16 × 10 MB parsed JSON docs = 160 MB buffered per stream in a chain. For big objects, set `highWaterMark: 1` or 2.
- Every object flowing through a Transform chain is a heap allocation that GC must trace. High-throughput object-mode pipelines (millions of rows/sec) create serious minor-GC pressure — batching rows into arrays of ~1000 is a common 5–10x throughput fix.

```js
const { Transform } = require('stream');

// Object-mode with explicit HWM=2 because rows can be large.
const parseRow = new Transform({
  objectMode: true,
  highWaterMark: 2,
  transform(line, _enc, cb) {
    try {
      cb(null, JSON.parse(line));   // cb(null, value) === this.push(value); cb()
    } catch (err) {
      cb(err);                      // malformed row destroys the pipeline (or handle & skip)
    }
  },
});
```

---

### Q9. Design a memory-safe processor for a 10 GB CSV file: parse it, transform rows, and load into a database. Show the code and explain where memory is bounded.

**Answer:**
Requirements: constant memory (say < 100 MB RSS regardless of file size), bounded DB concurrency, correct error handling, and progress reporting. The naive `fs.readFile` → `split('\n')` needs 10 GB+ of heap and dies immediately (also: strings max out around 512 MB–1 GB in V8, so `readFile().toString()` throws before you even OOM).

```js
'use strict';
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

// Stage 1: byte chunks -> parsed row objects (handles chunk-boundary splits
// AND quoted fields containing commas/newlines — the two classic CSV bugs).
class CsvParser extends Transform {
  constructor() {
    super({ readableObjectMode: true, readableHighWaterMark: 64 });
    this.buffer = '';
    this.header = null;
    this.lineNo = 0;
  }

  // Minimal RFC-4180 field splitter for a complete line.
  static parseLine(line) {
    const fields = [];
    let field = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { field += '"'; i++; } // escaped quote
          else inQuotes = false;
        } else field += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(field); field = ''; }
      else field += ch;
    }
    fields.push(field);
    return fields;
  }

  _transform(chunk, _enc, cb) {
    this.buffer += chunk.toString('utf8');
    let start = 0, inQuotes = false;
    // Scan for newlines that are NOT inside quotes (multi-line fields).
    for (let i = 0; i < this.buffer.length; i++) {
      const ch = this.buffer[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === '\n' && !inQuotes) {
        const line = this.buffer.slice(start, i).replace(/\r$/, '');
        start = i + 1;
        this._emitLine(line);
      }
    }
    this.buffer = this.buffer.slice(start);  // keep only the unfinished tail
    cb();
  }

  _emitLine(line) {
    if (!line) return;
    this.lineNo++;
    const fields = CsvParser.parseLine(line);
    if (!this.header) { this.header = fields; return; }
    const row = {};
    for (let i = 0; i < this.header.length; i++) row[this.header[i]] = fields[i];
    this.push(row);
  }

  _flush(cb) {
    if (this.buffer) this._emitLine(this.buffer.replace(/\r$/, ''));
    cb();
  }
}

// Stage 2: batch rows — one INSERT per row is a 100x throughput mistake.
class Batcher extends Transform {
  constructor(size = 1000) {
    super({ objectMode: true, highWaterMark: 2 }); // 2 batches ≈ 2000 rows buffered max
    this.size = size;
    this.batch = [];
  }
  _transform(row, _enc, cb) {
    this.batch.push(row);
    if (this.batch.length >= this.size) {
      this.push(this.batch);
      this.batch = [];
    }
    cb();
  }
  _flush(cb) {
    if (this.batch.length) this.push(this.batch);
    cb();
  }
}

async function loadCsv(path, db) {
  let rows = 0;
  const started = Date.now();

  await pipeline(
    fs.createReadStream(path, { highWaterMark: 1 << 20 }), // 1 MiB reads: fewer syscalls for a big sequential file
    new CsvParser(),
    new Batcher(1000),
    async function* (batches) {                 // sink stage: DB writes with backpressure
      for await (const batch of batches) {
        await db.insertMany(batch);             // await = backpressure all the way to the fd
        rows += batch.length;
        if (rows % 100_000 === 0) {
          const mb = (process.memoryUsage().rss / 1e6).toFixed(0);
          console.log(`${rows} rows, RSS ${mb} MB, ${(rows / ((Date.now() - started) / 1000)).toFixed(0)} rows/s`);
        }
        yield;                                  // generators used as sinks must yield something
      }
    },
  );
  return rows;
}
```

Where memory is bounded (be able to enumerate this):
1. Read buffer: ≤ 1 MiB (fs HWM) + one in-flight chunk.
2. `CsvParser.buffer`: at most one incomplete record + one chunk.
3. Parser readable buffer: ≤ 64 row objects.
4. Batcher: ≤ 2 batches × 1000 rows.
5. DB stage: exactly one batch in flight, because `await db.insertMany` blocks the pull.

Total: a few MB, flat, for 10 GB or 10 TB. If the DB slows down, the `await` stops pulling, buffers fill to their HWMs, `_read` stops, and the file read stops. That end-to-end chain is the answer the interviewer is fishing for.

**Interview trap:** "Just use `readline.createInterface`?" — fine for logs, but it splits on every newline including those inside quoted CSV fields, silently corrupting data. Also mention that in production you'd reach for `csv-parse` or `papaparse` streaming mode rather than hand-rolling RFC 4180 — but you must be able to hand-roll the *streaming structure*.

---

### Q10. Why does an unhandled `'error'` event destroy a `pipe()` chain, and what exactly leaks?

**Answer:**
Two separate failure modes stack here:

1. **`'error'` with no listener throws.** Streams are EventEmitters; an `'error'` event with zero listeners throws the error synchronously (`ERR_UNHANDLED_ERROR` path), which becomes an `uncaughtException` and by default **kills the process**.
2. **`pipe()` does not forward errors or destroy peers.** If the middle of `a.pipe(b).pipe(c)` errors:
   - `a` never learns; it stays paused holding its fd/socket open — **fd leak**.
   - `c` never gets `end()`; a file written via `c` is left truncated/half-written; an HTTP response hangs until timeout.
   - `unpipe` is emitted, but nothing calls `destroy()`.

```js
const fs = require('fs');

// BROKEN: read error (e.g., file deleted mid-read, EIO) crashes the process,
// and even with an error handler, out's fd and the half-written file leak.
fs.createReadStream('huge.bin').pipe(fs.createWriteStream('/mnt/out.bin'));

// Manually correct (what pipeline() automates):
const src = fs.createReadStream('huge.bin');
const dst = fs.createWriteStream('/mnt/out.bin');
src.pipe(dst);
src.on('error', (err) => { dst.destroy(err); });
dst.on('error', (err) => { src.destroy(err); });
// Plus 'close' handling for premature termination... just use pipeline().
```

**Production war story:** An image-resizing service piped `httpRequest → sharpTransform → response`. When clients aborted downloads (mobile users, ~2% of requests), the response errored with `ECONNRESET`, but the upstream S3 read stream was never destroyed. Each abort leaked one HTTPS socket + ~64 KiB buffers. After ~30k requests the process hit the 1024 fd `ulimit`, every new S3 request failed with `EMFILE`, and the service hard-failed while CPU and memory looked healthy. The fix was a three-line change to `stream.pipeline()`. Monitor open fds (`ls /proc/<pid>/fd | wc -l`), not just memory.

---

### Q11. What does `stream.destroy()` actually do, and how does it differ from `end()`? What is the `'close'` event?

**Answer:**
- **`writable.end([chunk])`** — graceful: flushes everything buffered, calls `_final()`, emits `'finish'`. Data is preserved.
- **`stream.destroy([err])`** — immediate teardown: buffered data is **dropped**, `_destroy(err, cb)` is called to release resources (close fd, destroy socket), then `'close'` is emitted (and `'error'` first, if err was passed). After destroy, `write()`/`push()` fail.
- **`'close'`** — the terminal event: the stream and its underlying resource are done, whether via success or destruction. `emitClose: true` is the default since Node 14. If you need "this stream is over, one way or another," listen for `'close'` — or better, use `stream.finished()`:

```js
const { finished } = require('stream/promises');

const rs = fs.createReadStream('data.bin');
consumeSomehow(rs);
try {
  await finished(rs);        // resolves on end/finish, rejects on error/premature close
} finally {
  rs.destroy();              // idempotent — guarantees the fd is released
}
```

Event order cheat sheet:
- Readable happy path: `'data'`× n → `'end'` → `'close'`
- Writable happy path: `'finish'` (after `end()` + flush) → `'close'`
- Any stream destroyed with error: `'error'` → `'close'`

**Interview trap:** `'finish'` vs `'end'`. `'end'` fires on the *readable* side (no more data to read); `'finish'` fires on the *writable* side (`end()` called and all data flushed to the OS). For `fs.WriteStream`, `'finish'` does **not** mean bytes are on disk — the kernel page cache holds them; you need `fs.fsync` for durability.

---

### Q12. `readable.unshift()` — what is it for and where does it bite?

**Answer:**
`unshift(chunk)` pushes data back to the *front* of the read buffer. Use case: protocol parsers that read a header and discover they consumed bytes belonging to the body:

```js
// Read exactly the 4-byte length prefix, put back any extra bytes.
function readFrame(socket, onFrame) {
  socket.once('readable', function onReadable() {
    const header = socket.read(4);
    if (header === null) return socket.once('readable', onReadable);
    const len = header.readUInt32BE(0);
    const body = socket.read(len);
    if (body === null) {
      socket.unshift(header);          // put the header back; wait for more bytes
      return socket.once('readable', onReadable);
    }
    onFrame(body);
  });
}
```

Rules: never call `unshift()` after `'end'`; calling it during a `'data'` handler in flowing mode causes re-emission ordering surprises — it's designed for paused-mode (`'readable'` + `read()`) parsing. This is exactly how the HTTP parser hands off leftover bytes on `Upgrade`/`CONNECT` (the `head` Buffer in the `'upgrade'` event is data that arrived after the headers).

---

### Q13. How do `stream.Readable.from()`, `.toArray()`, `.map()`, `.filter()` change how you write stream code?

**Answer:**
Modern Node (16.5+ for `from` iterables; 17.4+ for the iterator-helpers) lets you treat streams as async collections:

```js
const { Readable } = require('stream');

// Any (async) iterable -> object-mode Readable
const src = Readable.from(fetchPagesGenerator());

// Iterator helpers: each returns a new Readable, lazily evaluated with
// bounded concurrency — this is built-in structured parallelism.
const results = await src
  .map(async (page) => enrich(page), { concurrency: 8 })  // 8 in flight max
  .filter((p) => p.status === 'active')
  .take(1000)
  .toArray();                                             // careful: buffers everything
```

`{ concurrency: N }` on `.map()` is the headline: before this you needed `p-limit` or `parallel-transform`. Ordering is preserved (results are emitted in input order even though they complete out of order). `.toArray()` obviously defeats streaming — only for bounded results.

**Interview trap:** `Readable.from(string)` iterates... the whole string as ONE chunk? No — a string is iterable *by code point*, so `Readable.from('abc')` in object mode emits `'a'`, `'b'`, `'c'`. Wrap it: `Readable.from(['abc'])`.

---

### Q14. Compare Node streams with WHATWG Web Streams (`ReadableStream`). Why do both exist in Node, and how do you bridge them?

**Answer:**

| | Node streams | Web Streams |
|---|---|---|
| API since | 2011 (v0.x) | Node 16.5 (stable 21) |
| Backpressure signal | `write() === false` + `'drain'` | `desiredSize` + promise from `writer.write()` |
| Error model | `'error'` events | Promise rejection / `cancel`/`abort` |
| Locking | Any number of consumers (chaos) | Reader/writer **locks** — one consumer at a time |
| BYOB (zero-copy reads) | No | Yes (`ReadableStreamBYOBReader`) |
| Transfer between threads | No (must pipe through MessagePort manually) | **Transferable** via `postMessage` |
| Used by | fs, net, http (server) | `fetch()` bodies, `Response`, edge runtimes |

Web Streams exist in Node because `fetch()` (undici) returns them and because code targeting Cloudflare Workers/Deno/browsers needs one API. Bridging:

```js
const { Readable, Writable } = require('stream');

// Web -> Node: process a fetch body with Node stream tooling
const res = await fetch('https://example.com/big.csv');
const nodeReadable = Readable.fromWeb(res.body);

// Node -> Web
const webReadable = Readable.toWeb(fs.createReadStream('big.csv'));
```

Performance note: Node streams are still measurably faster for high-throughput byte pumping in-process (fewer promise allocations per chunk); Web Streams pay a microtask per read. For a hot proxy path, this matters; for typical API code it doesn't.

---

### Q15. A pipeline's throughput is bad. How do you find whether the source, a transform, or the sink is the bottleneck?

**Answer:**
Streams self-report the bottleneck: **look at the buffer levels.** In a chain, buffers *upstream of the bottleneck are full; downstream are empty*.

```js
// Instrument a live pipeline: sample internal buffer fill ratios.
function monitor(streams, intervalMs = 1000) {
  const t = setInterval(() => {
    const report = streams.map(({ name, s }) => {
      const r = s._readableState, w = s._writableState;
      const parts = [];
      if (w) parts.push(`w:${w.length}/${w.highWaterMark}`);
      if (r) parts.push(`r:${r.length}/${r.highWaterMark}`);
      return `${name}[${parts.join(' ')}]`;
    });
    console.log(report.join(' -> '));
  }, intervalMs);
  t.unref();
}
// Reading: "gzip[w:65536/65536 r:12/65536]" => gzip's inbox is full, outbox
// empty => gzip itself (CPU) is the bottleneck. If the LAST writable is
// pinned at HWM, the sink (disk/DB/network) is the bottleneck.
```

Then fix accordingly:
- **Source-bound** (all buffers near empty): raise the read HWM (bigger chunks, fewer syscalls), check disk/network.
- **Transform CPU-bound**: it's on the event loop — offload to worker threads (see file 03) or use a native/streaming parser; `zlib` streams already run in the libuv threadpool, so 4 parallel gzip pipelines saturate the default 4-thread pool (`UV_THREADPOOL_SIZE`).
- **Sink-bound**: batch writes (`_writev`, `cork()`/`uncork()`), increase downstream concurrency.

`cork()` is worth naming: `writable.cork()` buffers writes and `uncork()` flushes them as one `_writev` — `res.write()` many small strings, corked, becomes one TCP packet instead of many (this is what `res.end()` effectively exploits, and why many small `write()`s without cork can trigger poor packet utilization).

---

### Q16. How do AbortSignal and streams interact? Cancel a pipeline cleanly.

**Answer:**
Every modern stream entry point accepts a signal:

```js
const { pipeline } = require('stream/promises');
const fs = require('fs');

const ac = new AbortController();
setTimeout(() => ac.abort(new Error('deadline exceeded')), 30_000).unref();

try {
  await pipeline(
    fs.createReadStream('in.bin', { signal: ac.signal }),  // fs streams take a signal
    transform,
    fs.createWriteStream('out.bin'),
    { signal: ac.signal },                                  // pipeline takes one too
  );
} catch (err) {
  if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
    // every stream in the chain was destroy()ed; fds are released
  } else throw err;
}
```

Also know `stream.addAbortSignal(signal, stream)` for retrofitting a signal onto any stream. On abort, the stream is `destroy(new AbortError())`ed — buffered data dropped, resource released. This is the correct pattern for tying uploads/exports to request lifetimes: pass the request's abort signal into the pipeline, so a client disconnect cancels the S3 read instead of processing 10 GB for a dead socket.

---

### Q17. Rapid-fire internals: `read(0)`, `push('')`, sync vs async `_read`, `'pause'` doesn't stop `'data'` immediately — explain each.

**Answer:**
- **`read(0)`** — triggers the internal read machinery (may call `_read()`) without consuming anything. Used internally to prime buffers; occasionally used to force a stalled stream to re-check its source.
- **`push('')`** in byte mode — pushes zero bytes; doesn't end the stream, doesn't emit data, but *does* reset some internal reading state. In object mode, `''` is a legitimate value and IS emitted. Only `push(null)` means EOF.
- **Sync `_read` recursion**: if `_read()` calls `push()` synchronously, the machinery loops calling `_read()` again until HWM — this is fine (it's a loop, not recursion, since v10's rewrite). But `push()`ing from a *different tick without a pending `_read`* after returning is also legal — `_read` is "please produce at least eventually," not "produce exactly once."
- **`pause()` isn't instantaneous**: `pause()` stops *future* emissions, but a chunk already extracted and mid-emit still delivers; moreover data already in flight from the kernel socket buffer keeps arriving into the internal buffer (just not emitted). So after `pause()` you can still get up to one `'data'` event, and `readableState.length` can still grow to HWM. Never rely on `pause()` for byte-exact cutoffs — use `read(n)`.

---

### Q18. Design question: stream a large database export to an HTTP client as gzipped CSV, handling client disconnects, DB errors, and slow clients. What does the full production-grade handler look like?

**Answer:**

```js
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

async function exportHandler(req, res) {
  // 1. Client-lifetime abort: disconnect cancels the DB cursor.
  const ac = new AbortController();
  res.on('close', () => {           // fires on normal end AND on abort
    if (!res.writableFinished) ac.abort();
  });

  // 2. Source: DB cursor as an async generator — pull-based, so a slow
  //    client (backpressure through res -> gzip -> here) pauses the cursor,
  //    and the DB does no wasted work.
  async function* rows(signal) {
    const cursor = db.query('SELECT * FROM events ORDER BY id').cursor(5000);
    try {
      yield 'id,type,created_at\n';                       // header
      for await (const batch of cursor) {
        signal.throwIfAborted();
        yield batch.map(r => `${r.id},${csvEscape(r.type)},${r.created_at.toISOString()}\n`).join('');
      }
    } finally {
      await cursor.close();          // ALWAYS release the cursor — even on abort
    }
  }

  res.writeHead(200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-encoding': 'gzip',
    'content-disposition': 'attachment; filename="events.csv.gz"',
    // No content-length: it's chunked transfer encoding — that's fine.
  });

  try {
    await pipeline(
      Readable.from(rows(ac.signal)),
      zlib.createGzip({ level: 1 }),  // level 1: ~4x faster than default 6, still ~3x compression on CSV
      res,
      { signal: ac.signal },
    );
  } catch (err) {
    if (ac.signal.aborted) return;    // client went away — normal, don't log as error
    // Headers already sent — can't send a 500. Kill the socket so the client
    // sees a truncated/failed download instead of a "successful" partial file.
    res.destroy(err);
    logger.error({ err }, 'export failed mid-stream');
  }
}

function csvEscape(s) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
```

Points to narrate: pull-based source = DB throttled by client speed; abort wiring = no orphaned cursors; the "headers already sent" problem (you cannot 500 mid-stream — destroying the socket is the only honest signal); gzip level trade-off (level 6 default can make gzip the CPU bottleneck at ~50–150 MB/s per core, level 1 runs ~4x faster); and that trailers or a length-prefixed footer row are how some systems signal "export complete" in-band since the status code can't.

**Production war story:** An export endpoint buffered query results into an array "to compute Content-Length for the progress bar." Worked in staging (10k rows). A customer with 40M rows requested an export; the pod hit its 2 GB memory limit and was OOM-killed — taking down 30 other in-flight requests on that pod. Chunked encoding + streaming has no Content-Length, and that's the correct trade: progress bars can use a row-count header from a cheap `COUNT(*)` estimate instead.

---

### Q19. What are the memory semantics of `Buffer.concat` in stream consumers, and when is collecting a stream into memory acceptable?

**Answer:**
The common "collect" idiom:

```js
async function collect(stream, maxBytes = 10 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > maxBytes) {
      stream.destroy();
      throw Object.assign(new Error('payload too large'), { code: 'E_TOO_LARGE', size });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);  // pass total length: one allocation, one copy pass
}
```

Rules for seniors:
1. **Always enforce a max size.** An unbounded `collect()` on a request body is a one-request DoS (attacker streams gigabytes slowly). This is why body parsers have `limit` options (express.json defaults to 100 KB).
2. `Buffer.concat(chunks)` without the length argument does an extra pass to sum lengths — pass `size` since you tracked it.
3. Peak memory is ~2× payload (chunks + the concatenated copy exist simultaneously). For a 100 MB payload that's 200 MB transient — per concurrent request.
4. Buffers are *external* memory — they don't show in `heapUsed`, only in `rss`/`external`. A "heap looks fine but RSS is huge" mystery is almost always Buffers (see file 05).

Collecting is fine when: payloads are bounded and small (JSON APIs), you need the whole payload anyway (signature verification, JSON.parse), and concurrency × maxSize fits in memory. Stream when any of those fail.

---

### Q20. Interview trap round-up: five stream statements — true or false?

**Answer:**

1. **"`write()` returning false means the write failed."** False — the chunk is buffered and will be written; false is purely a flow-control signal. Write failures arrive via the `'error'` event / `write(chunk, cb)`'s callback error.
2. **"`highWaterMark` limits memory usage of a stream."** False — it's the threshold where the stream *signals* pressure; ignoring the signal grows the buffer without limit. Memory safety comes from producers honoring the signal (which `pipe`/`pipeline`/`await` do).
3. **"`pipe()` handles errors."** False — it forwards neither errors nor destruction. Any prod pipeline must use `pipeline()` or manual bidirectional error wiring (Q10).
4. **"`'finish'` on an `fs.WriteStream` means the data is durably on disk."** False — it means Node flushed to the kernel. Power loss can still eat it; `fs.fsync(fd)` (or `fs.createWriteStream(path, { flags: 'a', flush: true })` in Node ≥ 21 for close-time flush) is required for durability claims.
5. **"Object mode with HWM 16 keeps memory bounded."** Only bounded in *count* — 16 × unbounded object size. And in a 5-stage pipeline it's 16 × stages × 2 (each stage has readable+writable buffers). Size your HWM to object size, not defaults.

If you can explain *why* each of these is false with the internal mechanism, you're answering at the senior level this topic demands.
