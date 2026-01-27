# Streams & Backpressure: Data Processing in Node.js

Streams enable efficient processing of large datasets by processing data in chunks. Understanding backpressure is crucial for production applications.

## What are Streams?   --- IMP

**Streams** are objects that let you read/write data continuously in chunks rather than loading everything into memory.

### Stream Types

Node.js provides four fundamental types of streams, each serving a different purpose in the data lifecycle:

1.  **Readable**: Source streams that allow you to read data from a source (e.g., `fs.createReadStream`, `http.IncomingMessage`). Data flows **out** of a readable stream.
2.  **Writable**: Destination streams that allow you to write data to a destination (e.g., `fs.createWriteStream`, `http.ServerResponse`). Data flows **into** a writable stream.
3.  **Duplex**: Streams that are both Readable and Writable (e.g., `net.Socket`). The read and write channels are independent of each other.
4.  **Transform**: A special type of Duplex stream where the output is computed based on the input. It "transforms" the data as it passes through (e.g., `zlib.createGzip`, `crypto.createCipher`).

---

```javascript
const { Readable, Writable, Transform, Duplex } = require('stream');

// Readable: Read data
class MyReadable extends Readable {
    _read() {
        this.push('chunk of data');
    }
}

// Writable: Write data
class MyWritable extends Writable {
    _write(chunk, encoding, callback) {
        console.log(chunk.toString());
        callback();
    }
}

// Transform: Read and write (transform data)
class MyTransform extends Transform {
    _transform(chunk, encoding, callback) {
        this.push(chunk.toString().toUpperCase());
        callback();
    }
}
```

## Backpressure

**Backpressure** occurs when data is produced faster than it can be consumed.

### Problem

```javascript
// ❌ Problem: Producer faster than consumer
const readable = fs.createReadStream('large-file.txt');
const writable = fs.createWriteStream('output.txt');

readable.pipe(writable);
// If writable can't keep up, data buffers in memory
```

### Solution: Handle Backpressure

```javascript
// ✅ Solution: Handle backpressure
const readable = fs.createReadStream('large-file.txt');
const writable = fs.createWriteStream('output.txt');

readable.on('data', (chunk) => {
    const canContinue = writable.write(chunk);
    if (!canContinue) {
        // Pause reading when buffer full
        readable.pause();
    }
});

writable.on('drain', () => {
    // Resume reading when buffer drained
    readable.resume();
});
```

## Real-World Examples

### Example 1: File Processing

```javascript
const fs = require('fs');
const { Transform } = require('stream');

// Transform stream: Process file line by line
class LineProcessor extends Transform {
    constructor() {
        super({ objectMode: true });
        this.buffer = '';
    }
    
    _transform(chunk, encoding, callback) {
        this.buffer += chunk.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();  // Keep incomplete line
        
        lines.forEach(line => {
            if (line.trim()) {
                this.push({ line, processed: line.toUpperCase() });
            }
        });
        
        callback();
    }
    
    _flush(callback) {
        if (this.buffer.trim()) {
            this.push({ line: this.buffer, processed: this.buffer.toUpperCase() });
        }
        callback();
    }
}

// Use
const readable = fs.createReadStream('data.txt');
const processor = new LineProcessor();
const writable = fs.createWriteStream('output.txt');

readable
    .pipe(processor)
    .on('data', (data) => {
        writable.write(JSON.stringify(data) + '\n');
    });
```

### Example 2: HTTP Response Streaming

```javascript
const http = require('http');

// Stream large response
app.get('/large-data', (req, res) => {
    const readable = fs.createReadStream('large-file.json');
    
    res.setHeader('Content-Type', 'application/json');
    
    readable.pipe(res);
    
    readable.on('error', (error) => {
        res.status(500).json({ error: error.message });
    });
});
```

## Best Practices

1. **Use Streams**: For large data processing
2. **Handle Backpressure**: Pause/resume appropriately
3. **Error Handling**: Handle errors in streams
4. **Pipeline**: Use `stream.pipeline()` for error handling
5. **Memory**: Streams prevent memory issues

## Summary

**Streams & Backpressure:**

1. **Types**: Readable, Writable, Transform, Duplex
2. **Backpressure**: Handle when producer > consumer
3. **Benefits**: Memory efficient, handles large data
4. **Best Practice**: Use pipeline, handle errors
5. **Use Cases**: File processing, HTTP streaming

**Key Takeaway:**
Streams process data in chunks, making them memory-efficient for large datasets. Handle backpressure by pausing readable when writable buffer is full. Use `stream.pipeline()` for automatic error handling. Streams are essential for file processing and HTTP streaming.

**Stream Strategy:**
- Use streams for large data
- Handle backpressure
- Use pipeline for error handling
- Monitor memory usage
- Process in chunks

**Next Steps:**
- Learn [Buffers](buffers_binary_data.md) for binary data
- Study [Child Processes](child_processes_cluster.md) for parallelism
- Master [Event Loop](event_loop_libuv.md) for async operations

