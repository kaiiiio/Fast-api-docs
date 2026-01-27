# Advanced Streams & Pipelines in Node.js

Building on the core streams concepts, this guide covers advanced patterns for composing, managing, and optimizing data processing pipelines.

## 1. Composition: `stream.pipeline()`
While `.pipe()` is convenient, it doesn't handle errors well. If one stream fails, the others are not closed. **`pipeline()`** solves this.

```javascript
const { pipeline } = require('stream/promises'); // v15+ Promise API
const fs = require('fs');
const zlib = require('zlib');

async function runPipeline() {
  await pipeline(
    fs.createReadStream('input.txt'),
    zlib.createGzip(),
    fs.createWriteStream('input.txt.gz')
  );
  console.log('Pipeline succeeded');
}
```

---

## 2. Object Mode
Streams are binary by default (Buffers). Use **`objectMode: true`** to process JavaScript objects directly.
- **Use Case**: Processing database rows, JSON lines, or custom data structures.

```javascript
const { Transform } = require('stream');

const filterHighValues = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    if (chunk.value > 100) {
      this.push(chunk);
    }
    callback();
  }
});
```

---

## 3. Stream Utilities
- **`stream.finished()`**: Check when a stream is no longer readable/writable.
- **`stream.Readable.from()`**: Create a readable stream from an iterator or async generator (very powerful).

### Async Generator Pattern
```javascript
const { Readable } = require('stream');

async function* generateData() {
  yield 'chunk 1';
  yield 'chunk 2';
}

const readable = Readable.from(generateData());
```

---

## 4. Advanced Backpressure Management
- **HighWaterMark**: The buffer size threshold. Adjust this (`highWaterMark: 16384`) to tune performance.
- **Internal Buffering**: Understand that reading too many files concurrently can exhaust memory even with streams if you aren't managing the queue of streams itself.

---

## 5. Summary of Stream Types
| Type | Description | Internal Method |
| :--- | :--- | :--- |
| **Readable** | Source of data. | `_read()` |
| **Writable** | Destination for data. | `_write()` |
| **Duplex** | Both Readable and Writable (e.g., a Network Socket). Both flows are independent. | `_read`, `_write` |
| **Transform** | A Duplex stream where the output is computed from the input (e.g., Compression). | `_transform` |

---

## 6. Pro-Tip: Scrypt & Crypto Streams
Streaming is highly recommended for cryptographic operations to avoid keeping sensitive plain-text data in memory buffers for longer than necessary.
```javascript
const crypto = require('crypto');
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
input.pipe(cipher).pipe(output);
```
