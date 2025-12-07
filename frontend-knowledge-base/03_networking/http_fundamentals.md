# HTTP Fundamentals: Methods, Status Codes, Headers

Understanding HTTP fundamentals is essential for frontend development and API integration.

## HTTP Methods

### GET

**GET** retrieves data from server.

```javascript
// GET request
fetch('/api/users')
    .then(res => res.json());

// No body, idempotent, cacheable
```

### POST

**POST** creates new resources.

```javascript
// POST request
fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'John' })
});

// Has body, not idempotent, not cacheable
```

### PUT

**PUT** updates entire resource.

```javascript
// PUT request
fetch('/api/users/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'John Updated' })
});

// Has body, idempotent
```

### PATCH

**PATCH** partially updates resource.

```javascript
// PATCH request
fetch('/api/users/1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'John Updated' })
});

// Has body, not necessarily idempotent
```

### DELETE

**DELETE** removes resource.

```javascript
// DELETE request
fetch('/api/users/1', {
    method: 'DELETE'
});

// No body, idempotent
```

## HTTP Status Codes

### 2xx Success

```javascript
// 200 OK: Request succeeded
// 201 Created: Resource created
// 204 No Content: Success, no content
```

### 3xx Redirection

```javascript
// 301 Moved Permanently
// 302 Found (temporary)
// 304 Not Modified: Use cached version
```

### 4xx Client Error

```javascript
// 400 Bad Request: Invalid request
// 401 Unauthorized: Authentication required
// 403 Forbidden: Access denied
// 404 Not Found: Resource not found
// 409 Conflict: Resource conflict
```

### 5xx Server Error

```javascript
// 500 Internal Server Error
// 502 Bad Gateway
// 503 Service Unavailable
// 504 Gateway Timeout
```

## HTTP Headers

### Request Headers

```javascript
fetch('/api/users', {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
        'Accept': 'application/json',
        'User-Agent': 'MyApp/1.0'
    }
});
```

### Response Headers

```javascript
// Caching
'Cache-Control': 'max-age=3600'
'ETag': 'W/"abc123"'
'Last-Modified': 'Wed, 21 Oct 2015 07:28:00 GMT'

// CORS
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, POST'
```

## Real-World Examples

### Example 1: RESTful API Client

```javascript
class APIClient {
    constructor(baseURL, token) {
        this.baseURL = baseURL;
        this.token = token;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            }
        };
        
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
```

## Best Practices

1. **Use Appropriate Methods**: GET, POST, PUT, DELETE
2. **Handle Status Codes**: Check response status
3. **Set Headers**: Content-Type, Authorization
4. **Error Handling**: Handle 4xx, 5xx errors
5. **Idempotency**: Use PUT for idempotent updates

## Summary

**HTTP Fundamentals:**

1. **Methods**: GET, POST, PUT, PATCH, DELETE
2. **Status Codes**: 2xx success, 4xx client, 5xx server
3. **Headers**: Request and response headers
4. **Best Practice**: Use appropriate methods, handle errors
5. **RESTful**: Follow REST principles

**Key Takeaway:**
HTTP methods define operations (GET retrieve, POST create, PUT update, DELETE remove). Status codes indicate result (2xx success, 4xx client error, 5xx server error). Headers provide metadata. Use appropriate methods and handle all status codes. Follow RESTful principles.

**HTTP Strategy:**
- Use appropriate methods
- Handle all status codes
- Set proper headers
- Error handling
- RESTful design

**Next Steps:**
- Learn [Caching Strategies](caching_strategies.md) for performance
- Study [CORS](cors_configuration.md) for cross-origin
- Master [WebSockets](websockets_sse.md) for real-time

---

## 🎯 Interview Questions: Frontend

### Q1: Explain HTTP fundamentals in detail, including methods (GET, POST, PUT, PATCH, DELETE), status codes, headers, and their use cases. Provide examples showing how to use each HTTP method correctly and handle different status codes.

**Answer:**

**HTTP Overview:**

HTTP (HyperText Transfer Protocol) is the foundation of data communication on the web. Understanding HTTP methods, status codes, and headers is essential for frontend development and API integration. HTTP is a stateless protocol that defines how clients and servers communicate.

**HTTP Methods:**

**1. GET - Retrieve Data**

**Purpose:** Fetch data from server without side effects.

**Characteristics:**
- Idempotent: Multiple requests have same effect
- Safe: No data modification
- Cacheable: Responses can be cached
- No request body

**Example:**
```javascript
// GET request
const response = await fetch('/api/users');
const users = await response.json();

// GET with query parameters
const response = await fetch('/api/users?page=1&limit=10');
const users = await response.json();

// GET with headers
const response = await fetch('/api/users', {
    headers: {
        'Authorization': 'Bearer token123',
        'Accept': 'application/json'
    }
});
```

**When to Use:**
- Fetching user data
- Getting list of items
- Retrieving resources
- Any read operation

**2. POST - Create Resource**

**Purpose:** Create new resources or submit data.

**Characteristics:**
- Not idempotent: Multiple requests create multiple resources
- Not safe: Modifies server state
- Not cacheable: Responses typically not cached
- Has request body

**Example:**
```javascript
// POST request - Create user
const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
    },
    body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
    })
});

const newUser = await response.json();
```

**When to Use:**
- Creating new resources
- Submitting forms
- Triggering actions
- Non-idempotent operations

**3. PUT - Update Entire Resource**

**Purpose:** Replace entire resource with new data.

**Characteristics:**
- Idempotent: Multiple requests have same effect
- Not safe: Modifies server state
- May be cacheable: Depends on implementation
- Has request body

**Example:**
```javascript
// PUT request - Update entire user
const response = await fetch('/api/users/123', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
    },
    body: JSON.stringify({
        name: 'John Updated',
        email: 'john.updated@example.com',
        age: 30
    })
});

const updatedUser = await response.json();
```

**When to Use:**
- Replacing entire resource
- Idempotent updates
- Upsert operations (create or update)

**4. PATCH - Partial Update**

**Purpose:** Partially update a resource.

**Characteristics:**
- May not be idempotent: Depends on implementation
- Not safe: Modifies server state
- Not cacheable: Responses typically not cached
- Has request body

**Example:**
```javascript
// PATCH request - Partial update
const response = await fetch('/api/users/123', {
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
    },
    body: JSON.stringify({
        email: 'newemail@example.com'  // Only update email
    })
});

const updatedUser = await response.json();
```

**When to Use:**
- Partial updates
- Updating specific fields
- When you don't want to send entire resource

**5. DELETE - Remove Resource**

**Purpose:** Delete a resource.

**Characteristics:**
- Idempotent: Multiple requests have same effect
- Not safe: Modifies server state
- Not cacheable: Responses typically not cached
- Usually no request body

**Example:**
```javascript
// DELETE request
const response = await fetch('/api/users/123', {
    method: 'DELETE',
    headers: {
        'Authorization': 'Bearer token123'
    }
});

if (response.ok) {
    console.log('User deleted');
}
```

**When to Use:**
- Deleting resources
- Removing data
- Cleanup operations

**HTTP Status Codes:**

**2xx Success:**

**200 OK:**
```javascript
// Request succeeded
const response = await fetch('/api/users/123');
if (response.status === 200) {
    const user = await response.json();
}
```

**201 Created:**
```javascript
// Resource created
const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'John' })
});
if (response.status === 201) {
    const newUser = await response.json();
    // Resource created successfully
}
```

**204 No Content:**
```javascript
// Success but no content to return
const response = await fetch('/api/users/123', {
    method: 'DELETE'
});
if (response.status === 204) {
    // Success, no body
}
```

**3xx Redirection:**

**301 Moved Permanently:**
```javascript
// Permanent redirect
// Browser caches redirect
// Use new URL permanently
```

**302 Found (Temporary):**
```javascript
// Temporary redirect
// Don't cache redirect
// May use different URL next time
```

**304 Not Modified:**
```javascript
// Use cached version
// Conditional request (If-None-Match header)
// Saves bandwidth
```

**4xx Client Error:**

**400 Bad Request:**
```javascript
// Invalid request
const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ invalid: 'data' })
});
if (response.status === 400) {
    const error = await response.json();
    // Handle validation error
}
```

**401 Unauthorized:**
```javascript
// Authentication required
const response = await fetch('/api/users');
if (response.status === 401) {
    // Redirect to login
    window.location.href = '/login';
}
```

**403 Forbidden:**
```javascript
// Access denied (authenticated but not authorized)
const response = await fetch('/api/admin/users');
if (response.status === 403) {
    // User doesn't have permission
    showError('Access denied');
}
```

**404 Not Found:**
```javascript
// Resource not found
const response = await fetch('/api/users/999');
if (response.status === 404) {
    // Resource doesn't exist
    showError('User not found');
}
```

**409 Conflict:**
```javascript
// Resource conflict (e.g., duplicate email)
const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'existing@example.com' })
});
if (response.status === 409) {
    // Handle conflict
    showError('Email already exists');
}
```

**5xx Server Error:**

**500 Internal Server Error:**
```javascript
// Server error
const response = await fetch('/api/users');
if (response.status === 500) {
    // Server problem
    showError('Server error, please try again');
}
```

**502 Bad Gateway:**
```javascript
// Gateway/proxy error
// Server acting as gateway received invalid response
```

**503 Service Unavailable:**
```javascript
// Service temporarily unavailable
// Server overloaded or maintenance
```

**HTTP Headers:**

**Request Headers:**

**Content-Type:**
```javascript
// Specifies request body format
fetch('/api/users', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'John' })
});
```

**Authorization:**
```javascript
// Authentication token
fetch('/api/users', {
    headers: {
        'Authorization': 'Bearer token123'
    }
});
```

**Accept:**
```javascript
// Specifies acceptable response formats
fetch('/api/users', {
    headers: {
        'Accept': 'application/json'
    }
});
```

**Response Headers:**

**Cache-Control:**
```javascript
// Caching directives
// Response header
'Cache-Control': 'max-age=3600'  // Cache for 1 hour
'Cache-Control': 'no-cache'       // Don't cache
'Cache-Control': 'no-store'       // Don't store
```

**ETag:**
```javascript
// Entity tag for cache validation
// Response header
'ETag': 'W/"abc123"'

// Use in conditional request
fetch('/api/users', {
    headers: {
        'If-None-Match': 'W/"abc123"'
    }
});
// If unchanged, returns 304 Not Modified
```

**CORS Headers:**
```javascript
// Cross-Origin Resource Sharing
// Response headers
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
'Access-Control-Allow-Headers': 'Content-Type, Authorization'
```

**Complete API Client Example:**

```javascript
class APIClient {
    constructor(baseURL, token) {
        this.baseURL = baseURL;
        this.token = token;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, config);
            
            // Handle different status codes
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to login
                    window.location.href = '/login';
                    throw new Error('Unauthorized');
                }
                
                if (response.status === 403) {
                    throw new Error('Forbidden');
                }
                
                if (response.status === 404) {
                    throw new Error('Not found');
                }
                
                if (response.status === 409) {
                    const error = await response.json();
                    throw new Error(error.message);
                }
                
                if (response.status >= 500) {
                    throw new Error('Server error');
                }
                
                // Other 4xx errors
                const error = await response.json();
                throw new Error(error.message || 'Request failed');
            }
            
            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Usage
const api = new APIClient('https://api.example.com', 'token123');

// GET
const users = await api.get('/users');

// POST
const newUser = await api.post('/users', {
    name: 'John',
    email: 'john@example.com'
});

// PUT
const updated = await api.put('/users/123', {
    name: 'John Updated',
    email: 'john.updated@example.com'
});

// PATCH
const partiallyUpdated = await api.patch('/users/123', {
    email: 'newemail@example.com'
});

// DELETE
await api.delete('/users/123');
```

**Best Practices:**

**1. Use Appropriate Methods:**
```javascript
// ✅ GET for retrieval
GET /api/users

// ✅ POST for creation
POST /api/users

// ✅ PUT for full update
PUT /api/users/123

// ✅ PATCH for partial update
PATCH /api/users/123

// ✅ DELETE for deletion
DELETE /api/users/123
```

**2. Handle All Status Codes:**
```javascript
// ✅ Always check response status
const response = await fetch('/api/users');
if (!response.ok) {
    // Handle error based on status code
    handleError(response.status);
}
```

**3. Set Proper Headers:**
```javascript
// ✅ Always set Content-Type
headers: {
    'Content-Type': 'application/json'
}

// ✅ Include Authorization when needed
headers: {
    'Authorization': 'Bearer token'
}
```

**4. Error Handling:**
```javascript
// ✅ Handle different error types
try {
    const response = await fetch('/api/users');
    if (!response.ok) {
        if (response.status === 401) {
            // Handle unauthorized
        } else if (response.status === 404) {
            // Handle not found
        } else {
            // Handle other errors
        }
    }
} catch (error) {
    // Handle network errors
}
```

**System Design Consideration**: HTTP is fundamental for:
1. **API Design**: RESTful principles
2. **Error Handling**: Proper status code usage
3. **Performance**: Caching strategies
4. **Security**: Authentication and authorization
5. **Compatibility**: Cross-origin communication

HTTP methods define operations (GET retrieve, POST create, PUT update, DELETE remove). Status codes indicate results (2xx success, 4xx client error, 5xx server error). Headers provide metadata and control behavior. Understanding HTTP fundamentals is essential for building robust frontend applications and integrating with APIs.

