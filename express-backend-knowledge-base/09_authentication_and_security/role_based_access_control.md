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

### Example 2: Multi-Tenant RBAC

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

