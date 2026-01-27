# Process Lifecycle & Signals: Managing Node.js Processes

Understanding process lifecycle and signals is crucial for graceful shutdowns and process management in production.

## Process Lifecycle

The lifecycle of a Node.js process is managed by the V8 engine and libuv. It follows a predictable path from initial execution to termination.

### Stages of the Process Lifecycle
1.  **Initialize**: Node.js starts, loads the script, and initializes the execution environment (Globals, Modules).
2.  **Execute Sync Code**: The main script is executed from top to bottom. Asynchronous calls are scheduled but not yet executed.
3.  **Enter Event Loop**: Once the synchronous code finishes, the Event Loop takes over to handle scheduled tasks (Timers, I/O).
4.  **Running State**: Node remains active as long as there are pending callbacks or active handles (e.g., an open HTTP server or database connection).
5.  **Shutdown Initiation**: Triggered when the event loop has no more work, `process.exit()` is called, or a system signal (SIGINT/SIGTERM) is received.
6.  **Exit**: The process releases memory and shuts down.

### Core Lifecycle Events
- **`beforeExit`**: Emitted when the event loop is empty and Node is about to exit. You can schedule more work here to keep the process alive.
- **`exit`**: Emitted when the process is definitely shutting down. Only **synchronous** code can be executed here.
- **`uncaughtException`**: Emitted when an error isn't caught. The process is in an undefined state and should usually be restarted.
- **`unhandledRejection`**: Emitted when a Promise is rejected without a `.catch()`.

### Startup

```javascript
// Process starts
console.log('Process starting...');

// Setup
const server = require('http').createServer();
server.listen(3000);

console.log('Server started on port 3000');
```

### Running

```javascript
// Process running
// Handle requests, process data, etc.
```

### Shutdown

```javascript
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
```

## Signals

### SIGTERM

**SIGTERM** requests graceful termination.

```javascript
process.on('SIGTERM', () => {
    console.log('SIGTERM: Graceful shutdown');
    // Cleanup: Close connections, save state
    cleanup();
    process.exit(0);
});
```

### SIGINT

**SIGINT** (Ctrl+C) requests termination.

```javascript
process.on('SIGINT', () => {
    console.log('SIGINT: Shutting down');
    cleanup();
    process.exit(0);
});
```

### SIGUSR2

**SIGUSR2** used for restart (PM2, nodemon).

```javascript
process.on('SIGUSR2', () => {
    console.log('SIGUSR2: Restarting');
    // Graceful restart
    server.close(() => {
        process.kill(process.pid, 'SIGTERM');
    });
});
```

## Graceful Shutdown

### Complete Example

```javascript
const express = require('express');
const app = express();

const server = app.listen(3000);

// Graceful shutdown
let isShuttingDown = false;

function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`${signal} received, shutting down gracefully`);
    
    // Stop accepting new requests
    server.close(() => {
        console.log('HTTP server closed');
        
        // Close database connections
        db.close(() => {
            console.log('Database closed');
            
            // Close Redis connections
            redis.quit(() => {
                console.log('Redis closed');
                process.exit(0);
            });
        });
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
        console.error('Forced shutdown');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Reject new requests during shutdown
app.use((req, res, next) => {
    if (isShuttingDown) {
        res.status(503).json({ error: 'Server is shutting down' });
    } else {
        next();
    }
});
```

## Best Practices

1. **Handle Signals**: SIGTERM, SIGINT
2. **Graceful Shutdown**: Close connections, save state
3. **Timeout**: Force shutdown after timeout
4. **Health Checks**: Reject new requests during shutdown
5. **Logging**: Log shutdown process

## Summary

**Process Lifecycle & Signals:**

1. **Lifecycle**: Startup, running, shutdown
2. **Signals**: SIGTERM, SIGINT, SIGUSR2
3. **Graceful Shutdown**: Close connections, cleanup
4. **Best Practice**: Handle signals, timeout
5. **Use Cases**: Production deployments, restarts

**Key Takeaway:**
Process lifecycle includes startup, running, and shutdown phases. Handle SIGTERM and SIGINT for graceful shutdowns. Close connections, save state, and reject new requests during shutdown. Set timeout for forced shutdown. Proper shutdown ensures data integrity.

**Shutdown Strategy:**
- Handle signals
- Close connections
- Save state
- Reject new requests
- Set timeout

**Next Steps:**
- Learn [Event Loop](event_loop_libuv.md) for async operations
- Study [Child Processes](child_processes_cluster.md) for parallelism
- Master [Deployment](../13_devops_deployment/) for production

