# GDPR Compliance Design: Data Protection and Privacy

GDPR (General Data Protection Regulation) requires proper handling of personal data. This guide covers GDPR compliance in Express.js applications.

## GDPR Requirements

**Key Requirements:**
- Right to access
- Right to erasure (deletion)
- Right to data portability
- Consent management
- Data minimization
- Security by design

## Implementation

### User Data Access

```javascript
// Get all user data
app.get('/users/:id/data', requireAuth, async (req, res) => {
    const userId = req.params.id;
    
    // Verify user can access their own data
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Collect all user data
    const userData = {
        profile: await User.findByPk(userId),
        orders: await Order.findAll({ where: { user_id: userId } }),
        addresses: await Address.findAll({ where: { user_id: userId } }),
        preferences: await Preference.findAll({ where: { user_id: userId } }),
        logs: await ActivityLog.findAll({ where: { user_id: userId } })
    };
    
    res.json(userData);
});
```

### Right to Erasure

```javascript
// Delete user data (GDPR right to erasure)
app.delete('/users/:id', requireAuth, async (req, res) => {
    const userId = req.params.id;
    
    // Verify user can delete their own data
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Soft delete (mark as deleted)
    await User.update(
        { deleted_at: new Date(), email: `deleted_${Date.now()}@deleted.com` },
        { where: { id: userId } }
    );
    
    // Anonymize related data
    await Order.update(
        { user_email: null, user_name: 'Deleted User' },
        { where: { user_id: userId } }
    );
    
    // Log deletion
    await DeletionLog.create({
        user_id: userId,
        deleted_at: new Date(),
        reason: 'GDPR right to erasure'
    });
    
    res.json({ message: 'User data deleted' });
});
```

### Data Portability

```javascript
// Export user data (GDPR data portability)
app.get('/users/:id/export', requireAuth, async (req, res) => {
    const userId = req.params.id;
    
    if (req.user.id !== parseInt(userId)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Collect all user data
    const userData = {
        profile: await User.findByPk(userId),
        orders: await Order.findAll({ where: { user_id: userId } }),
        preferences: await Preference.findAll({ where: { user_id: userId } })
    };
    
    // Export as JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-${userId}-data.json"`);
    res.json(userData);
});
```

### Consent Management

```javascript
// Consent model
const Consent = sequelize.define('Consent', {
    user_id: DataTypes.INTEGER,
    consent_type: DataTypes.STRING,  // 'marketing', 'analytics', 'cookies'
    granted: DataTypes.BOOLEAN,
    granted_at: DataTypes.DATE,
    revoked_at: DataTypes.DATE
});

// Grant consent
app.post('/users/:id/consent', requireAuth, async (req, res) => {
    const { consent_type, granted } = req.body;
    
    if (granted) {
        await Consent.create({
            user_id: req.params.id,
            consent_type,
            granted: true,
            granted_at: new Date()
        });
    } else {
        await Consent.update(
            { revoked_at: new Date() },
            { where: { user_id: req.params.id, consent_type } }
        );
    }
    
    res.json({ message: 'Consent updated' });
});

// Check consent
async function hasConsent(userId, consentType) {
    const consent = await Consent.findOne({
        where: {
            user_id: userId,
            consent_type: consentType,
            granted: true,
            revoked_at: null
        }
    });
    
    return !!consent;
}
```

## Real-World Examples

### Example 1: Complete GDPR Implementation

```javascript
// GDPR service
class GDPRService {
    // Get all user data
    async getUserData(userId) {
        return {
            profile: await User.findByPk(userId),
            orders: await Order.findAll({ where: { user_id: userId } }),
            addresses: await Address.findAll({ where: { user_id: userId } }),
            consents: await Consent.findAll({ where: { user_id: userId } }),
            activity: await ActivityLog.findAll({ where: { user_id: userId } })
        };
    }
    
    // Delete user data
    async deleteUserData(userId) {
        const transaction = await sequelize.transaction();
        
        try {
            // Anonymize user
            await User.update(
                {
                    email: `deleted_${Date.now()}@deleted.com`,
                    name: 'Deleted User',
                    phone: null,
                    deleted_at: new Date()
                },
                { where: { id: userId }, transaction }
            );
            
            // Anonymize orders
            await Order.update(
                {
                    user_email: null,
                    user_name: 'Deleted User'
                },
                { where: { user_id: userId }, transaction }
            );
            
            // Delete consents
            await Consent.destroy({ where: { user_id: userId }, transaction });
            
            // Log deletion
            await DeletionLog.create({
                user_id: userId,
                deleted_at: new Date(),
                reason: 'GDPR right to erasure'
            }, { transaction });
            
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    // Export user data
    async exportUserData(userId) {
        const data = await this.getUserData(userId);
        return JSON.stringify(data, null, 2);
    }
}

// Use in routes
const gdprService = new GDPRService();

app.get('/users/:id/data', requireAuth, async (req, res) => {
    const data = await gdprService.getUserData(req.params.id);
    res.json(data);
});

app.delete('/users/:id', requireAuth, async (req, res) => {
    await gdprService.deleteUserData(req.params.id);
    res.json({ message: 'Data deleted' });
});
```

## Best Practices

1. **Data Minimization**: Collect only necessary data
2. **Consent Management**: Track and manage user consent
3. **Right to Access**: Provide data export
4. **Right to Erasure**: Implement data deletion
5. **Audit Logging**: Log all data access and changes

## Summary

**GDPR Compliance Design:**

1. **Requirements**: Access, erasure, portability, consent
2. **Implementation**: Data export, deletion, consent tracking
3. **Best Practice**: Data minimization, consent management
4. **Benefits**: Legal compliance, user trust
5. **Ongoing**: Regular audits and updates

**Key Takeaway:**
GDPR compliance requires proper handling of personal data. Implement right to access (data export), right to erasure (data deletion), data portability (export in machine-readable format), and consent management. Practice data minimization (collect only necessary data) and security by design. Audit and log all data access.

**GDPR Strategy:**
- Data minimization
- Consent management
- Right to access
- Right to erasure
- Audit logging

**Next Steps:**
- Learn [Encrypting PII](encrypting_pii_at_rest.md) for data protection
- Study [Security Best Practices](../09_authentication_and_security/) for security
- Master [Data Modeling](../03_data_layer_fundamentals/data_modeling_principles.md) for design

