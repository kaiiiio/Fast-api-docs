# Child Processes & Cluster: Parallelism in Node.js

Node.js provides multiple ways to achieve parallelism: child processes, cluster module, and worker threads. This guide covers when and how to use each.

## Parallelism Models: When to use what?

Node.js is single-threaded, but it provides several ways to leverage multi-core systems. Choosing the right one depends on the nature of the task.

| Method | Best For | Architecture | Overhead |
| :--- | :--- | :--- | :--- |
| **`spawn()`** | Large data, external CLI tools | Separate process, Stream-based | Medium |
| **`exec()`** | Small data, shell commands | Separate process, Buffer-based | High |
| **`fork()`** | CPU-intensive Node.js tasks | Separate **Node.js** process, built-in IPC | Medium |
| **Worker Threads** | CPU-intensive calculations | **Shared memory (v8 heap)**, same process | Low |

---

## Child Processes
A child process is a separate instance of the OS process. It has its own memory, own V8 instance, and its own event loop.

### Communication (IPC)
When using `fork()`, Node.js automatically sets up an **IPC (Inter-Process Communication)** channel. You communicate using `.send()` and `.on('message')`. 

> [!IMPORTANT]
> **Heavy Data**: Avoid sending massive objects through IPC. Data is serialized/deserialized as JSON, which can block the event loop of both processes.

### spawn()

```javascript
const { spawn } = require('child_process');

// Spawn process
const child = spawn('node', ['worker.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

// Handle output
child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
});
```

### exec()

```javascript
const { exec } = require('child_process');

// Execute command
exec('ls -la', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    console.log(stdout);
});
```

### fork()

```javascript
const { fork } = require('child_process');

// Fork Node.js process
const child = fork('./worker.js');

// Send message
child.send({ type: 'task', data: 'process this' });

// Receive message
child.on('message', (message) => {
    console.log('Received:', message);
});
```

## Cluster Module

**Cluster** creates multiple Node.js processes sharing server ports.

### Basic Cluster

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    // Master process: Fork workers
    const numWorkers = os.cpus().length;
    
    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();  // Restart worker
    });
} else {
    // Worker process: Run application
    const express = require('express');
    const app = express();
    
    app.get('/', (req, res) => {
        res.json({ pid: process.pid, worker: cluster.worker.id });
    });
    
    app.listen(3000);
}
```

## Worker Threads   --- IMP

**Worker threads** provide true parallelism with shared memory.

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
    // Main thread
    const worker = new Worker(__filename, {
        workerData: { start: 0, end: 1000000 }
    });
    
    worker.on('message', (result) => {
        console.log('Result:', result);
    });
} else {
    // Worker thread
    const { start, end } = workerData;
    let sum = 0;
    
    for (let i = start; i < end; i++) {
        sum += i;
    }
    
    parentPort.postMessage(sum);
}
```

## Real-World Examples

### Example 1: CPU-Intensive Task   --- IMP

```javascript
// Main process
const { fork } = require('child_process');

function processLargeData(data) {
    return new Promise((resolve, reject) => {
        const worker = fork('./data-processor.js');
        
        worker.send({ data });
        
        worker.on('message', (result) => {
            resolve(result);
            worker.kill();
        });
        
        worker.on('error', reject);
    });
}

// Worker: data-processor.js
process.on('message', ({ data }) => {
    // CPU-intensive processing
    const result = data.map(item => {
        // Heavy computation
        return processItem(item);
    });
    
    process.send({ result });
});
```

## Best Practices

1. **Child Processes**: For separate programs
2. **Cluster**: For HTTP servers
3. **Worker Threads**: For CPU-intensive tasks
4. **Communication**: Use message passing
5. **Error Handling**: Handle process failures

## Summary

**Child Processes & Cluster:**

1. **Child Processes**: Spawn separate processes
2. **Cluster**: Multiple processes, shared port
3. **Worker Threads**: True parallelism
4. **Best Practice**: Use appropriate method
5. **Use Cases**: CPU-intensive tasks, scaling

**Key Takeaway:**
Node.js provides child processes, cluster, and worker threads for parallelism. Use child processes for separate programs. Use cluster for HTTP server scaling. Use worker threads for CPU-intensive tasks with shared memory. Handle communication and errors properly.

**Parallelism Strategy:**
- Child processes for separate programs
- Cluster for HTTP servers
- Worker threads for CPU tasks
- Handle communication
- Monitor processes

**Next Steps:**
- Learn [Event Loop](event_loop_libuv.md) for async operations
- Study [Streams](streams_backpressure.md) for data processing
- Master [Performance](../12_performance_optimization/) for optimization

