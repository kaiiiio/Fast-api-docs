# Role-Based Access Control: Implementing RBAC in Express.js

Role-Based Access Control (RBAC) restricts access based on user roles. This guide covers implementing RBAC in Express.js applications.

## What is RBAC?

**Role-Based Access Control** assigns permissions to roles, and users are assigned roles. Access is granted based on roles, not individual permissions.

### RBAC Structure

```
Users → Roles → Permissions → Resources
```

## Basic RBAC Implementation

### Database Schema

```javascript
// Models
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: DataTypes.STRING,
    name: DataTypes.STRING
});

const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true },
    description: DataTypes.TEXT
});

const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true },
    resource: DataTypes.STRING,  // 'users', 'orders', 'products'
    action: DataTypes.STRING    // 'create', 'read', 'update', 'delete'
});

// Junction tables
const UserRole = sequelize.define('UserRole', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    role_id: { type: DataTypes.INTEGER, primaryKey: true }
});

const RolePermission = sequelize.define('RolePermission', {
    role_id: { type: DataTypes.INTEGER, primaryKey: true },
    permission_id: { type: DataTypes.INTEGER, primaryKey: true }
});

// Relationships
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' });

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id' });
```

## Middleware for RBAC

### Role Check Middleware

```javascript
// Middleware to check if user has role
function requireRole(...roles) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Get user roles
        const user = await User.findByPk(req.user.id, {
            include: [Role]
        });
        
        const userRoles = user.Roles.map(role => role.name);
        
        // Check if user has required role
        const hasRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        
        next();
    };
}

// Use middleware
app.get('/admin/users', requireRole('admin'), async (req, res) => {
    const users = await User.findAll();
    res.json(users);
});
```

### Permission Check Middleware

```javascript
// Middleware to check if user has permission
function requirePermission(resource, action) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Get user with roles and permissions
        const user = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                include: [Permission]
            }]
        });
        
        // Collect all permissions from user's roles
        const permissions = new Set();
        user.Roles.forEach(role => {
            role.Permissions.forEach(permission => {
                permissions.add(`${permission.resource}:${permission.action}`);
            });
        });
        
        // Check permission
        const requiredPermission = `${resource}:${action}`;
        if (!permissions.has(requiredPermission)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        
        next();
    };
}

// Use middleware
app.post('/users', requirePermission('users', 'create'), async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json(user);
});

app.put('/users/:id', requirePermission('users', 'update'), async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
});
```

## Real-World Examples

### Example 1: E-Commerce RBAC

```javascript
// Roles: admin, manager, customer
// Permissions: manage_products, manage_orders, view_reports

// Admin: All permissions
const adminRole = await Role.create({
    name: 'admin',
    description: 'Full system access'
});

await adminRole.addPermissions([
    await Permission.findOne({ where: { name: 'manage_products' } }),
    await Permission.findOne({ where: { name: 'manage_orders' } }),
    await Permission.findOne({ where: { name: 'view_reports' } })
]);

// Manager: Limited permissions
const managerRole = await Role.create({
    name: 'manager',
    description: 'Manage products and orders'
});

await managerRole.addPermissions([
    await Permission.findOne({ where: { name: 'manage_products' } }),
    await Permission.findOne({ where: { name: 'manage_orders' } })
]);

// Customer: View only
const customerRole = await Role.create({
    name: 'customer',
    description: 'Customer access'
});

// Routes with RBAC
app.get('/products', async (req, res) => {
    // Public route, no auth needed
    const products = await Product.find({ published: true });
    res.json(products);
});

app.post('/products', requireRole('admin', 'manager'), async (req, res) => {
    // Only admin and manager can create products
    const product = await Product.create(req.body);
    res.status(201).json(product);
});

app.delete('/products/:id', requireRole('admin'), async (req, res) => {
    // Only admin can delete products
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
});

app.get('/reports', requireRole('admin'), async (req, res) => {
    // Only admin can view reports
    const reports = await generateReports();
    res.json(reports);
});
```

### Example 2: Multi-Tenant RBAC   --- IMP

```javascript
// RBAC with tenant isolation
function requirePermission(resource, action) {
    return async (req, res, next) => {
        const user = req.user;
        const tenantId = req.tenantId;  // From tenant middleware
        
        // Check permission within tenant context
        const hasPermission = await checkTenantPermission(
            user.id,
            tenantId,
            resource,
            action
        );
        
        if (!hasPermission) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        next();
    };
}

async function checkTenantPermission(userId, tenantId, resource, action) {
    const user = await User.findByPk(userId, {
        include: [{
            model: Role,
            where: { tenant_id: tenantId },  // Tenant-scoped roles
            include: [Permission]
        }]
    });
    
    // Check permissions
    // ...
}
```

## Optimizing Permission Checks

### Cache User Permissions

```javascript
// Cache user permissions for performance
async function getUserPermissions(userId) {
    const cacheKey = `user_permissions:${userId}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database
    const user = await User.findByPk(userId, {
        include: [{
            model: Role,
            include: [Permission]
        }]
    });
    
    // Collect permissions
    const permissions = new Set();
    user.Roles.forEach(role => {
        role.Permissions.forEach(permission => {
            permissions.add(`${permission.resource}:${permission.action}`);
        });
    });
    
    const permissionsArray = Array.from(permissions);
    
    // Cache for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(permissionsArray));
    
    return permissionsArray;
}

// Invalidate on role/permission change
async function invalidateUserPermissions(userId) {
    await redis.del(`user_permissions:${userId}`);
}
```

## Best Practices

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Cache Permissions**: Cache user permissions for performance
3. **Audit Logging**: Log permission checks and access attempts
4. **Regular Reviews**: Review and update roles/permissions regularly
5. **Test Permissions**: Test RBAC thoroughly

## Common Patterns

### Pattern 1: Role Hierarchy

```javascript
// Roles with hierarchy
const roleHierarchy = {
    'super_admin': ['admin', 'manager', 'user'],
    'admin': ['manager', 'user'],
    'manager': ['user'],
    'user': []
};

function hasRole(userRoles, requiredRole) {
    return userRoles.some(role => {
        if (role === requiredRole) return true;
        const hierarchy = roleHierarchy[role] || [];
        return hierarchy.includes(requiredRole);
    });
}
```

### Pattern 2: Resource Ownership

```javascript
// Check if user owns resource
function requireOwnershipOrRole(resourceModel, ...roles) {
    return async (req, res, next) => {
        const resourceId = req.params.id;
        const resource = await resourceModel.findByPk(resourceId);
        
        // Check ownership
        if (resource.user_id === req.user.id) {
            return next();
        }
        
        // Check role
        const user = await User.findByPk(req.user.id, { include: [Role] });
        const userRoles = user.Roles.map(r => r.name);
        const hasRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        next();
    };
}

// Use: Users can edit own posts, or admins can edit any
app.put('/posts/:id', requireOwnershipOrRole(Post, 'admin'), async (req, res) => {
    // ...
});
```

## Summary

**Role-Based Access Control:**

#### Role-Based Access Control (RBAC) is an architectural pattern that focuses on **mapping organizational roles to technical permissions**. Instead of managing access for individual users, you define what an "Admin" or "Manager" can do, drastically reducing the complexity of security management as your team and application scale.

1. **Purpose**: Restrict access based on user roles
2. **Structure**: Users → Roles → Permissions → Resources
3. **Implementation**: Middleware for role/permission checks
4. **Best Practice**: Cache permissions, audit logging, least privilege
5. **Patterns**: Role hierarchy, resource ownership

**Key Takeaway:**
RBAC restricts access based on user roles rather than individual permissions. Implement RBAC with roles, permissions, and middleware to check access. Cache user permissions for performance, implement audit logging, and follow the principle of least privilege. Use role hierarchies and resource ownership patterns for flexible access control.

**RBAC Components:**
- Roles: Groups of permissions
- Permissions: Actions on resources
- Middleware: Access checks
- Caching: Performance optimization

**Next Steps:**
- Learn [JWT Implementation](jwt_implementation.md) for authentication
- Study [Password Hashing](password_hashing_best_practices.md) for security
- Master [Security Best Practices](../09_authentication_and_security/) for comprehensive security

---

## 🎯 Interview Questions: Role-Based Access Control   --- IMP

### Q1: Explain the fundamental concepts of RBAC (Role-Based Access Control) and how it differs from ACL (Access Control Lists) and ABAC (Attribute-Based Access Control). When would you choose RBAC for an Express.js application?

**Answer:**

Role-Based Access Control (RBAC) is an **administrative abstraction layer** that simplifies the management of user permissions by grouping them into logical roles. Unlike ACLs, which can become unmanageable as user counts grow, or ABAC, which introduces high complexity, RBAC provides a scalable "sweet spot" for most Express.js backend services.

**RBAC (Role-Based Access Control):**

RBAC assigns **permissions to roles**, and **users are assigned roles**. Access is determined by the user's role, not individual permissions. It follows the principle: "Users have roles, roles have permissions."

**Structure:**
```
User → Role → Permissions → Resources
```

**Example:**
- User "Alice" has role "Admin"
- Role "Admin" has permissions: ["read:users", "write:users", "delete:users"]
- Alice can perform all admin actions

**ACL (Access Control Lists):**

ACL assigns **permissions directly to users or resources**. Each resource maintains a list of users and their permissions.

**Structure:**
```
Resource → User → Permissions
```

**Example:**
- File "document.pdf" → User "Alice" → ["read", "write"]
- File "document.pdf" → User "Bob" → ["read"]
- Each resource has its own access list

**ABAC (Attribute-Based Access Control):**

ABAC uses **attributes** (user, resource, environment) to make access decisions. Policies evaluate attributes dynamically.

**Structure:**
```
Policy: IF user.department == "Finance" AND resource.type == "financial" AND time.hour < 18 THEN allow
```

**Key Differences:**

| Aspect | RBAC | ACL | ABAC |
|--------|------|-----|------|
| **Granularity** | Role-based | User/resource-based | Attribute-based |
| **Scalability** | Good (roles shared) | Poor (per-user lists) | Excellent (policy-based) |
| **Flexibility** | Moderate | High (per-resource) | Very High (dynamic) |
| **Complexity** | Low | Medium | High |
| **Use Case** | Standard apps | File systems | Enterprise systems |

**When to Choose RBAC:**

1. **Standard Web Applications**: Most Express.js apps (users, admins, moderators)
2. **Clear Role Hierarchy**: Well-defined roles (user, admin, manager)
3. **Moderate Complexity**: Not too many roles (5-20 roles)
4. **Team-Based Access**: Groups of users with similar permissions

**When NOT to Choose RBAC:**

1. **Fine-Grained Permissions**: Each user needs unique permissions (use ACL)
2. **Dynamic Policies**: Access depends on context (time, location, attributes) → ABAC
3. **Resource Ownership**: Users own resources with custom permissions → ACL

**System Design Consideration**: RBAC is the **sweet spot** for most Express.js applications because it balances **simplicity** (easy to understand), **scalability** (roles shared across users), and **maintainability** (change role permissions, all users updated). Choose RBAC for standard web apps; use ACL for file systems or resource ownership; use ABAC for enterprise systems with complex policies.

---

### Q2: Explain the difference between "role-based" and "permission-based" access control. How would you implement a hybrid approach that uses both roles and permissions in an Express.js application?

**Answer:**

**Role-Based Access Control:**

Access is determined by **user roles**. Middleware checks if user has a specific role.

```javascript
// Role-based: Check role
function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Insufficient role' });
        }
        next();
    };
}

// Usage
app.delete('/users/:id', requireRole('admin'), deleteUser);
```

**Permission-Based Access Control:**

Access is determined by **specific permissions**. Middleware checks if user has a permission.

```javascript
// Permission-based: Check permission
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        next();
    };
}

// Usage
app.delete('/users/:id', requirePermission('delete:users'), deleteUser);
```

**Key Differences:**

| Aspect | Role-Based | Permission-Based |
|--------|------------|------------------|
| **Granularity** | Coarse (role = many permissions) | Fine (specific permission) |
| **Flexibility** | Low (role is all-or-nothing) | High (mix and match permissions) |
| **Complexity** | Simple (one role check) | Complex (permission management) |
| **Use Case** | Simple apps | Complex apps with many permissions |

**Hybrid Approach (Roles + Permissions):**

Roles contain permissions, but middleware can check either roles or permissions. This provides flexibility while maintaining simplicity.

**Database Schema:**

```javascript
// Models
const User = sequelize.define('User', {
    id: DataTypes.INTEGER,
    email: DataTypes.STRING
});

const Role = sequelize.define('Role', {
    id: DataTypes.INTEGER,
    name: DataTypes.STRING  // 'admin', 'user', 'moderator'
});

const Permission = sequelize.define('Permission', {
    id: DataTypes.INTEGER,
    name: DataTypes.STRING  // 'read:users', 'write:users', 'delete:users'
});

// Relationships
User.belongsToMany(Role, { through: 'UserRoles' });
Role.belongsToMany(Permission, { through: 'RolePermissions' });
```

**Implementation:**

```javascript
// Get user permissions (from roles)
async function getUserPermissions(userId) {
    const user = await User.findByPk(userId, {
        include: [{
            model: Role,
            include: [Permission]
        }]
    });
    
    // Collect all permissions from all roles
    const permissions = new Set();
    user.Roles.forEach(role => {
        role.Permissions.forEach(permission => {
            permissions.add(permission.name);
        });
    });
    
    return Array.from(permissions);
}

// Middleware: Check role OR permission
function requireRoleOrPermission(role, permission) {
    return async (req, res, next) => {
        const user = req.user;
        
        // Check role (fast path)
        if (user.role === role) {
            return next();
        }
        
        // Check permission (slower, requires lookup)
        const permissions = await getUserPermissions(user.id);
        if (permissions.includes(permission)) {
            return next();
        }
        
        return res.status(403).json({ error: 'Access denied' });
    };
}

// Usage: Can check role or permission
app.delete('/users/:id', 
    requireRoleOrPermission('admin', 'delete:users'),
    deleteUser
);
```

**Benefits of Hybrid:**

1. **Flexibility**: Can check roles (simple) or permissions (granular)
2. **Backward Compatibility**: Existing role checks still work
3. **Gradual Migration**: Can migrate from roles to permissions incrementally
4. **Performance**: Role check is fast (direct comparison), permission check requires lookup

**System Design Consideration**: Hybrid approach provides **flexibility** (use roles for simple checks, permissions for fine-grained control) while maintaining **simplicity** (roles for common cases). Start with roles, add permissions as complexity grows. Cache user permissions in Redis for performance (avoid database lookup on every request).

---

### Q3: How would you implement "resource ownership" in RBAC, where users can only access resources they own? Explain the pattern and provide an Express.js implementation example.

**Answer:**

Resource ownership is a **contextual authorization pattern** that goes beyond static roles to verify the relationship between a user and specific data. In an Express environment, this typically involves a middleware check that compares the authenticated user's ID against the owner field of the requested resource before granting access.

**Resource Ownership Pattern:**

Resource ownership allows users to access resources they created/own, even if they don't have global permissions. It combines RBAC (role-based permissions) with ownership checks (user owns resource).

**Pattern:**

```
Global Permission: "read:users" → Can read any user
Ownership Permission: "read:own:users" → Can read only own user record
```

**Implementation:**

```javascript
// Middleware: Check ownership
function requireOwnershipOrPermission(resourceModel, resourceIdParam, permission) {
    return async (req, res, next) => {
        const resourceId = req.params[resourceIdParam];
        const userId = req.user.id;
        
        // Check if user owns resource
        const resource = await resourceModel.findByPk(resourceId);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        
        // Ownership check: user_id matches
        if (resource.user_id === userId) {
            return next();  // Owner can access
        }
        
        // Not owner: Check global permission
        const userPermissions = await getUserPermissions(userId);
        if (userPermissions.includes(permission)) {
            return next();  // Has global permission
        }
        
        return res.status(403).json({ error: 'Access denied' });
    };
}

// Usage
app.get('/users/:id', 
    authenticateToken,
    requireOwnershipOrPermission(User, 'id', 'read:users'),
    getUser
);

app.put('/users/:id', 
    authenticateToken,
    requireOwnershipOrPermission(User, 'id', 'write:users'),
    updateUser
);
```

**Advanced: Resource-Specific Permissions:**

```javascript
// Check if user can access specific resource
async function canAccessResource(userId, resourceType, resourceId, action) {
    // Get resource
    const Resource = getModel(resourceType);
    const resource = await Resource.findByPk(resourceId);
    
    if (!resource) return false;
    
    // Ownership check
    if (resource.user_id === userId) {
        return true;  // Owner can always access
    }
    
    // Global permission check
    const permission = `${action}:${resourceType}`;
    const userPermissions = await getUserPermissions(userId);
    
    return userPermissions.includes(permission);
}

// Middleware
function requireResourceAccess(resourceType, action) {
    return async (req, res, next) => {
        const resourceId = req.params.id;
        const userId = req.user.id;
        
        const canAccess = await canAccessResource(userId, resourceType, resourceId, action);
        
        if (!canAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        next();
    };
}
```

**Real-World Example: Blog Posts**

```javascript
// Users can edit their own posts OR have "write:posts" permission
app.put('/posts/:id', 
    authenticateToken,
    async (req, res, next) => {
        const postId = req.params.id;
        const userId = req.user.id;
        
        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Ownership check
        if (post.author_id === userId) {
            return next();  // Owner can edit
        }
        
        // Global permission check
        const permissions = await getUserPermissions(userId);
        if (permissions.includes('write:posts')) {
            return next();  // Has global permission
        }
        
        return res.status(403).json({ error: 'Access denied' });
    },
    updatePost
);
```

**System Design Consideration**: Resource ownership is essential for **multi-tenant applications** where users own resources (posts, files, orders). It provides **fine-grained access control** (users can access their own resources) while maintaining **administrative access** (admins can access all resources via global permissions). Always check ownership **before** global permissions for performance (ownership check is faster, often sufficient).

---

### Q4: Explain the concept of "permission caching" in RBAC systems. Why is it necessary, and how would you implement it with cache invalidation in Express.js?

**Answer:**

Permission caching is a **critical performance optimization** for high-traffic Express applications that use complex RBAC systems. By storing a user's evaluated permissions in a low-latency cache like Redis, you can eliminate redundant database joins on every request, keeping authorization checks efficient without compromising security.

**Permission Caching:**

Permission caching stores user permissions in a fast cache (Redis) to avoid database queries on every request. Since permissions change infrequently, caching dramatically improves performance.

**Why It's Necessary:**

**Without Caching:**
```
Request 1: GET /users → Query DB for user permissions → 50ms
Request 2: GET /posts → Query DB for user permissions → 50ms
Request 3: GET /comments → Query DB for user permissions → 50ms
(Every request requires database query)
```

**With Caching:**
```
Request 1: GET /users → Query DB → Cache → 50ms
Request 2: GET /posts → Cache hit → 1ms
Request 3: GET /comments → Cache hit → 1ms
(Subsequent requests use cache)
```

**Performance Impact:**

- **Database Query**: 50-100ms (network + query)
- **Cache Lookup**: 1-5ms (in-memory)
- **Improvement**: 10-50x faster

**Implementation:**

```javascript
const redis = require('redis');
const client = redis.createClient();

// Get user permissions (with caching)
async function getUserPermissions(userId) {
    const cacheKey = `permissions:${userId}`;
    
    // Check cache
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Cache miss: Query database
    const user = await User.findByPk(userId, {
        include: [{
            model: Role,
            include: [Permission]
        }]
    });
    
    // Collect permissions
    const permissions = new Set();
    user.Roles.forEach(role => {
        role.Permissions.forEach(permission => {
            permissions.add(permission.name);
        });
    });
    
    const permissionsArray = Array.from(permissions);
    
    // Cache for 1 hour
    await client.setEx(cacheKey, 3600, JSON.stringify(permissionsArray));
    
    return permissionsArray;
}
```

**Cache Invalidation:**

When permissions change (user role updated, role permissions changed), cache must be invalidated to ensure consistency.

**Invalidation Strategies:**

**1. User-Level Invalidation:**

```javascript
// When user role changes
async function updateUserRole(userId, roleId) {
    const transaction = await sequelize.transaction();
    
    try {
        // Update database
        await UserRole.update(
            { role_id: roleId },
            { where: { user_id: userId }, transaction }
        );
        
        // Invalidate cache
        await client.del(`permissions:${userId}`);
        
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

**2. Role-Level Invalidation:**

```javascript
// When role permissions change (invalidate all users with this role)
async function updateRolePermissions(roleId, permissionIds) {
    const transaction = await sequelize.transaction();
    
    try {
        // Update database
        await RolePermission.destroy(
            { where: { role_id: roleId }, transaction }
        );
        
        await RolePermission.bulkCreate(
            permissionIds.map(pid => ({ role_id: roleId, permission_id: pid })),
            { transaction }
        );
        
        // Find all users with this role
        const users = await User.findAll({
            include: [{
                model: Role,
                where: { id: roleId }
            }],
            transaction
        });
        
        // Invalidate cache for all affected users
        const pipeline = client.pipeline();
        users.forEach(user => {
            pipeline.del(`permissions:${user.id}`);
        });
        await pipeline.exec();
        
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

**3. TTL-Based Expiration:**

```javascript
// Cache expires after TTL (eventual consistency)
await client.setEx(cacheKey, 3600, JSON.stringify(permissions));
// Cache valid for 1 hour, then refreshes from database
```

**4. Cache Tags (Advanced):**

```javascript
// Tag cache entries with role IDs
async function getUserPermissions(userId) {
    const user = await User.findByPk(userId, { include: [Role] });
    const roleIds = user.Roles.map(r => r.id).sort().join(',');
    const cacheKey = `permissions:${userId}:roles:${roleIds}`;
    
    // Cache key includes role IDs, automatically invalidates when roles change
    // (new role combination = new cache key)
}
```

**Complete Implementation:**

```javascript
// Middleware with caching
async function requirePermission(permission) {
    return async (req, res, next) => {
        const userId = req.user.id;
        
        // Get permissions (cached)
        const permissions = await getUserPermissions(userId);
        
        if (!permissions.includes(permission)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        
        next();
    };
}
```

**System Design Consideration**: Permission caching is **essential** for performance (10-50x faster than database queries). Use **TTL-based expiration** for eventual consistency (simpler) or **explicit invalidation** for immediate consistency (more complex). Balance between **performance** (long TTL) and **consistency** (short TTL or invalidation). For high-security systems, prefer explicit invalidation; for high-performance systems, TTL-based expiration is acceptable.

---

### Q5: How would you implement "audit logging" for RBAC in an Express.js application? What information should be logged, and how would you design the audit log schema to support compliance and security investigations?

**Answer:**

**Audit Logging for RBAC:**

Audit logging records all access control decisions (who accessed what, when, and whether access was granted or denied). It's essential for security investigations, compliance (GDPR, SOC2), and detecting unauthorized access attempts.

**What to Log:**

1. **Access Attempts**: Every permission check (granted or denied)
2. **User Identity**: User ID, email, IP address
3. **Resource**: Resource type, resource ID, action attempted
4. **Decision**: Allowed or denied, reason
5. **Context**: Timestamp, request ID, user agent
6. **Changes**: Role assignments, permission changes

**Audit Log Schema:**

```javascript
const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true  // Null for unauthenticated attempts
    },
    user_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    action: {
        type: DataTypes.STRING,  // 'read', 'write', 'delete', 'login', 'logout'
        allowNull: false
    },
    resource_type: {
        type: DataTypes.STRING,  // 'user', 'post', 'order'
        allowNull: true
    },
    resource_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    permission_checked: {
        type: DataTypes.STRING,  // 'read:users', 'write:posts'
        allowNull: true
    },
    decision: {
        type: DataTypes.ENUM('allowed', 'denied'),
        allowNull: false
    },
    reason: {
        type: DataTypes.STRING,  // 'has_permission', 'resource_owner', 'insufficient_permissions'
        allowNull: true
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    user_agent: {
        type: DataTypes.STRING,
        allowNull: true
    },
    request_id: {
        type: DataTypes.STRING,  // Correlation ID for request tracing
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    indexes: [
        { fields: ['user_id'] },
        { fields: ['resource_type', 'resource_id'] },
        { fields: ['decision'] },
        { fields: ['timestamp'] },
        { fields: ['action'] }
    ]
});
```

**Implementation:**

```javascript
// Audit logging middleware
async function auditAccess(req, decision, reason) {
    await AuditLog.create({
        user_id: req.user?.id || null,
        user_email: req.user?.email || null,
        action: req.method.toLowerCase(),  // 'get', 'post', 'put', 'delete'
        resource_type: req.route?.path.split('/')[1] || null,  // Extract from route
        resource_id: req.params.id || null,
        permission_checked: req.permissionChecked || null,
        decision: decision,  // 'allowed' or 'denied'
        reason: reason,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_id: req.id || null,
        timestamp: new Date()
    });
}

// Enhanced permission middleware with auditing
function requirePermission(permission) {
    return async (req, res, next) => {
        req.permissionChecked = permission;
        
        const userId = req.user?.id;
        if (!userId) {
            await auditAccess(req, 'denied', 'unauthenticated');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const permissions = await getUserPermissions(userId);
        const hasPermission = permissions.includes(permission);
        
        if (hasPermission) {
            await auditAccess(req, 'allowed', 'has_permission');
            return next();
        }
        
        await auditAccess(req, 'denied', 'insufficient_permissions');
        return res.status(403).json({ error: 'Permission denied' });
    };
}
```

**Role Change Auditing:**

```javascript
// Audit role assignments
async function assignRoleToUser(userId, roleId, assignedBy) {
    const transaction = await sequelize.transaction();
    
    try {
        // Assign role
        await UserRole.create({ user_id: userId, role_id: roleId }, { transaction });
        
        // Audit log
        await AuditLog.create({
            user_id: assignedBy,
            action: 'assign_role',
            resource_type: 'user',
            resource_id: userId,
            decision: 'allowed',
            reason: `Role ${roleId} assigned to user ${userId}`,
            timestamp: new Date()
        }, { transaction });
        
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

**Querying Audit Logs:**

```javascript
// Get access attempts for a user
async function getUserAccessLogs(userId, limit = 100) {
    return await AuditLog.findAll({
        where: { user_id: userId },
        order: [['timestamp', 'DESC']],
        limit
    });
}

// Get denied access attempts (security investigation)
async function getDeniedAccessAttempts(startDate, endDate) {
    return await AuditLog.findAll({
        where: {
            decision: 'denied',
            timestamp: {
                [Op.between]: [startDate, endDate]
            }
        },
        order: [['timestamp', 'DESC']]
    });
}

// Get resource access history
async function getResourceAccessHistory(resourceType, resourceId) {
    return await AuditLog.findAll({
        where: {
            resource_type: resourceType,
            resource_id: resourceId
        },
        order: [['timestamp', 'DESC']]
    });
}
```

**System Design Consideration**: Audit logging is **essential for compliance** (GDPR, SOC2, HIPAA) and **security investigations** (detect unauthorized access, investigate breaches). Log all access decisions (allowed and denied), include sufficient context (user, resource, reason), and index logs for efficient querying. Store logs in **immutable storage** (append-only) and **retain for compliance period** (typically 1-7 years). Consider **log aggregation** (ELK stack, Splunk) for large-scale systems.