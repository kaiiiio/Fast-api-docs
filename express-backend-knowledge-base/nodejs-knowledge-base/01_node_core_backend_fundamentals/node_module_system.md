# Node.js Module System: CJS vs ESM

Node.js supports two module systems: CommonJS (CJS) and ES Modules (ESM). Understanding both is crucial for modern Node.js development.

## CommonJS (CJS)

**CommonJS (CJS)** is the traditional Node.js module system. It was designed for servers where files are stored locally, allow for **synchronous** loading.

### Key Characteristics of CJS
- **Synchronous**: Modules are loaded and executed one by one in the order they are required. This blocks the execution until the module is fully loaded.
- **Caching**: Once a module is loaded via `require()`, it is cached. Subsequent calls to `require()` for the same module return the cached `module.exports`, improving performance.
- **Module Wrapper**: Before a module's code is executed, Node.js wraps it in a function: `(function(exports, require, module, __filename, __dirname) { ... });`. This keeps variables locally scoped and provides access to CJS-specific globals.
- **Dynamic**: You can call `require()` inside `if` statements or loops since it is just a function.

### Basic CJS Syntax

```javascript
// math.js
function add(a, b) {
    return a + b;
}

function subtract(a, b) {
    return a - b;
}

// Export functions
module.exports = {
    add,
    subtract
};

// Or export individually
module.exports.add = add;
module.exports.subtract = subtract;

// Import in another file
const math = require('./math');
console.log(math.add(2, 3));  // 5
```

### CJS Features

```javascript
// Export default
module.exports = function() {
    return 'default export';
};

// Export multiple
module.exports = {
    function1: () => {},
    function2: () => {},
    constant: 42
};

// Require with destructuring
const { add, subtract } = require('./math');

// Require JSON
const config = require('./config.json');

// Require built-in modules
const fs = require('fs');
const path = require('path');
```

## ES Modules (ESM)  --- IMP

**ES Modules (ESM)** is the ECMAScript standard for modules. It brings a unified module system to both the browser and Node.js.

### Key Characteristics of ESM
- **Asynchronous**: Loading is performed in three distinct phases: **Construction** (matching imports to files), **Instantiation** (linking memory locations), and **Evaluation** (executing the code). This allows for non-blocking module loading.
- **Strict Mode**: ESM modules are executed in **Strict Mode (`"use strict"`)** by default.
- **Static**: `import` and `export` statements must be at the top level of the file (they cannot be inside conditionals). This enables "Tree Shaking" (removing unused code).
- **Top-Level Await**: You can use the `await` keyword at the top level of an ES module without wrapping it in an `async` function.
- **No CJS Globals**: CJS-specific variables like `__dirname`, `__filename`, and `require` are **not available**. You must use `import.meta.url` to derive paths.

### Basic ESM Syntax

```javascript
// math.mjs or package.json with "type": "module"
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

// Import in another file
import { add, subtract } from './math.js';
import multiply from './math.js';  // Default import

// Or import all
import * as math from './math.js';
```

### ESM Features

```javascript
// Named exports
export const PI = 3.14159;
export function calculateArea(radius) {
    return PI * radius * radius;
}

// Default export
export default class Calculator {
    // ...
}

// Import with alias
import { add as sum } from './math.js';

// Dynamic import
const math = await import('./math.js');
```

## Package.json Configuration

### Enable ESM

```json
{
    "type": "module",
    "main": "index.js"
}
```

**With `"type": "module"`:**
- `.js` files are treated as ESM
- Use `.cjs` for CommonJS files
- Use `.mjs` extension (optional)

### Mixed Module Systems

```json
{
    "type": "module",
    "main": "index.js",
    "exports": {
        ".": {
            "import": "./index.js",
            "require": "./index.cjs"
        }
    }
}
```

## Interoperability
Node.js allows CJS and ESM to coexist, but they have different execution models (Sync vs Async), making direct interaction tricky.

### 1. Using CJS in ESM (The Easy Way)
Since ESM execution is asynchronous, it can easily "wait" for the synchronous CJS module to load.
- **Default Import**: You can `import` a CJS module as a default export.
- **Named Imports**: Only works if the CJS module is a "static" object that Node can pre-scan.
- **`createRequire`**: The most reliable way for complex CJS libraries.

### 2. Using ESM in CJS (The Hard Way)
CJS is synchronous and cannot "wait" for an ESM module to load using `require()`. **`require()` on an ES Module will throw an error**.
- **Dynamic `import()`**: CJS must use the asynchronous `import()` function. This returns a promise, so it must be handled inside an `async` block or using `.then()`.

### Summary Comparison Table
| Feature | CommonJS (CJS) | ES Modules (ESM) |
| :--- | :--- | :--- |
| **Loading** | Synchronous | Asynchronous |
| **Default** | `module.exports` | `export default` |
| **Top-level Await** | ❌ No | ✅ Yes |
| **`__dirname`** | ✅ Yes | ❌ No (use `import.meta.url`) |
| **Dynamic Import** | `require()` (sync) | `import()` (async) |

### Using CJS in ESM

```javascript
// ESM file importing CJS
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cjsModule = require('./cjs-module.js');
```

### Using ESM in CJS

```javascript
// CJS file importing ESM (async)
(async () => {
    const esmModule = await import('./esm-module.js');
})();
```

## Real-World Examples

### Example 1: CommonJS Module

```javascript
// utils/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logFile) {
        this.logFile = logFile;
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(this.logFile, logMessage);
    }
}

module.exports = Logger;

// Use
const Logger = require('./utils/logger');
const logger = new Logger('app.log');
logger.log('Application started');
```

### Example 2: ES Module

```javascript
// utils/logger.mjs
import fs from 'fs/promises';
import path from 'path';

export class Logger {
    constructor(logFile) {
        this.logFile = logFile;
    }
    
    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        await fs.appendFile(this.logFile, logMessage);
    }
}

// Use
import { Logger } from './utils/logger.mjs';
const logger = new Logger('app.log');
await logger.log('Application started');
```

## Best Practices

1. **Use ESM for New Projects**: Modern standard
2. **CJS for Legacy**: Maintain existing CJS code
3. **Consistent**: Don't mix in same project
4. **File Extensions**: Use `.mjs` or `.cjs` for clarity
5. **Package.json**: Set `"type": "module"` for ESM

## Summary

**Node.js Module System:**

1. **CommonJS**: `require()` and `module.exports`
2. **ES Modules**: `import` and `export`
3. **Configuration**: `package.json` with `"type": "module"`
4. **Interoperability**: Can use both with care
5. **Best Practice**: Use ESM for new projects

**Key Takeaway:**
Node.js supports both CommonJS (traditional) and ES Modules (modern). CommonJS uses `require()` and `module.exports`. ES Modules use `import` and `export`. Enable ESM with `"type": "module"` in `package.json`. Use consistent module system in projects.

**Module Strategy:**
- New projects → ESM
- Legacy projects → CJS
- Be consistent
- Use proper extensions
- Configure package.json

**Next Steps:**
- Learn [Event Loop](event_loop_libuv.md) for Node.js internals
- Study [Streams](streams_backpressure.md) for data processing
- Master [Buffers](buffers_binary_data.md) for binary handling

