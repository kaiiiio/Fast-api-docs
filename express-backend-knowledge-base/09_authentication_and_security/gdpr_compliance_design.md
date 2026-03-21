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

---

## 🎯 Interview Questions: GDPR Compliance Design   -- IMP

### Q1: Explain the fundamental principles of GDPR (General Data Protection Regulation) and how they impact the design of Express.js applications. What are the key requirements that must be implemented?

**Answer:**

**GDPR Fundamental Principles:**

GDPR is a European Union regulation that governs how personal data is collected, processed, stored, and deleted. It applies to any organization that processes personal data of EU residents, regardless of where the organization is located.

**Key Principles:**

1. **Lawfulness, Fairness, and Transparency**: Process personal data lawfully, fairly, and transparently
2. **Purpose Limitation**: Collect data only for specified, explicit, and legitimate purposes
3. **Data Minimization**: Collect only data that is necessary for the stated purpose
4. **Accuracy**: Keep personal data accurate and up-to-date
5. **Storage Limitation**: Retain personal data only as long as necessary
6. **Integrity and Confidentiality**: Protect personal data with appropriate security measures
7. **Accountability**: Demonstrate compliance with GDPR principles

**Key Requirements for Express.js Applications:**

1. **Right to Access (Article 15)**: Users can request all their personal data
2. **Right to Rectification (Article 16)**: Users can correct inaccurate data
3. **Right to Erasure (Article 17)**: Users can request deletion of their data ("right to be forgotten")
4. **Right to Data Portability (Article 20)**: Users can export their data in machine-readable format
5. **Right to Object (Article 21)**: Users can object to processing of their data
6. **Consent Management (Article 7)**: Obtain and manage user consent for data processing
7. **Data Protection by Design (Article 25)**: Implement security measures from the start
8. **Breach Notification (Article 33)**: Notify authorities within 72 hours of data breach

**Impact on Application Design:**

GDPR requires applications to be designed with **privacy and data protection** as core principles, not afterthoughts. This impacts database schema (soft deletes, audit logs), API design (data export, deletion endpoints), security (encryption, access controls), and user experience (consent management, privacy settings).

**System Design Consideration**: GDPR is not just a compliance requirement but a **fundamental shift** in how applications handle personal data. Applications must be designed with **privacy by design** principles: data minimization (collect only what's needed), purpose limitation (use data only for stated purpose), storage limitation (delete when no longer needed), and user rights (access, rectification, erasure, portability). Non-compliance can result in **fines up to 4% of annual revenue** or €20 million, whichever is higher, so GDPR compliance is critical for any application processing EU residents' data.

---

### Q2: Explain the "right to erasure" (right to be forgotten) under GDPR. How would you implement data deletion in an Express.js application while maintaining data integrity and audit trails?

**Answer:**

**Right to Erasure (Right to Be Forgotten):**

The right to erasure allows users to request deletion of their personal data. However, deletion must be balanced with other requirements: legal obligations (retain data for tax records), legitimate interests (fraud prevention), and data integrity (maintain referential integrity in databases).

**Implementation Challenges:**

1. **Referential Integrity**: Deleting user data may break foreign key constraints (orders, transactions)
2. **Audit Trails**: Legal requirements may require retaining audit logs
3. **Backup Data**: Data in backups may not be immediately deletable
4. **Third-Party Data**: Data shared with third parties must also be deleted
5. **Anonymization vs. Deletion**: Some data may need anonymization rather than deletion

**Implementation Strategy:**

**1. Soft Delete with Anonymization:**

Instead of hard deletion, anonymize personal data while retaining records for integrity.

```javascript
// Soft delete with anonymization
async function deleteUserData(userId) {
    const transaction = await sequelize.transaction();
    
    try {
        // Anonymize user record
        await User.update({
            email: `deleted_${Date.now()}@deleted.com`,
            name: 'Deleted User',
            phone: null,
            address: null,
            deleted_at: new Date(),
            deletion_reason: 'GDPR right to erasure'
        }, {
            where: { id: userId },
            transaction
        });
        
        // Anonymize related records (orders, transactions)
        await Order.update({
            user_email: null,
            user_name: 'Deleted User',
            billing_address: null
        }, {
            where: { user_id: userId },
            transaction
        });
        
        // Delete consent records (no longer needed)
        await Consent.destroy({
            where: { user_id: userId },
            transaction
        });
        
        // Log deletion (audit trail)
        await DeletionLog.create({
            user_id: userId,
            deleted_at: new Date(),
            reason: 'GDPR right to erasure',
            anonymized: true
        }, { transaction });
        
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

**2. Hard Delete with Data Retention:**

For data that can be fully deleted, implement hard delete with retention period.

```javascript
// Hard delete after retention period
async function hardDeleteUserData(userId) {
    // Check if retention period expired
    const user = await User.findByPk(userId);
    if (user.deleted_at && Date.now() - user.deleted_at < 90 * 24 * 60 * 60 * 1000) {
        throw new Error('Retention period not expired (90 days)');
    }
    
    // Hard delete (permanent removal)
    await User.destroy({ where: { id: userId } });
    await Order.destroy({ where: { user_id: userId } });
    await Address.destroy({ where: { user_id: userId } });
}
```

**3. Backup Data Deletion:**

Schedule deletion of user data from backups.

```javascript
// Mark data for backup deletion
async function scheduleBackupDeletion(userId) {
    await BackupDeletionQueue.add({
        user_id: userId,
        deletion_date: new Date(),
        backup_locations: ['s3://backups/db-2024-01-01', 's3://backups/db-2024-01-02']
    });
}

// Background job to delete from backups
backupDeletionQueue.process(async (job) => {
    const { user_id, backup_locations } = job.data;
    
    for (const backup of backup_locations) {
        await deleteUserFromBackup(backup, user_id);
    }
});
```

**4. Third-Party Data Deletion:**

Notify and request deletion from third-party services.

```javascript
// Delete user data from third-party services
async function deleteThirdPartyData(userId) {
    const user = await User.findByPk(userId);
    
    // Delete from analytics service
    await analyticsService.deleteUser(user.analytics_id);
    
    // Delete from email service
    await emailService.deleteUser(user.email);
    
    // Delete from payment processor
    await paymentProcessor.deleteCustomer(user.stripe_customer_id);
}
```

**5. Legal Exception Handling:**

Handle cases where deletion is not possible due to legal obligations.

```javascript
// Check if deletion is legally allowed
async function canDeleteUserData(userId) {
    const user = await User.findByPk(userId);
    
    // Check legal obligations
    const hasActiveOrders = await Order.count({
        where: {
            user_id: userId,
            status: ['pending', 'processing']
        }
    });
    
    if (hasActiveOrders) {
        return {
            allowed: false,
            reason: 'Active orders must be retained for legal compliance'
        };
    }
    
    // Check tax retention requirements (7 years in some jurisdictions)
    const oldestOrder = await Order.findOne({
        where: { user_id: userId },
        order: [['created_at', 'ASC']]
    });
    
    if (oldestOrder && Date.now() - oldestOrder.created_at < 7 * 365 * 24 * 60 * 60 * 1000) {
        return {
            allowed: false,
            reason: 'Tax retention period not expired (7 years)'
        };
    }
    
    return { allowed: true };
}
```

**System Design Consideration**: Right to erasure is **complex** because it must balance user privacy rights with legal obligations and data integrity. Use **soft delete with anonymization** for most cases (maintains referential integrity, allows audit trails), **hard delete** only when legally permissible, and **backup deletion** for complete removal. Implement **legal exception handling** to comply with retention requirements (tax, fraud prevention). Deletion is not always immediate (backups, third-party services), so design the system to handle **asynchronous deletion** and **deletion status tracking**.

---

### Q3: Explain the "right to data portability" under GDPR. How would you implement data export functionality in an Express.js application, and what format should exported data be in?

**Answer:**

**Right to Data Portability:**

The right to data portability allows users to receive their personal data in a structured, commonly used, and machine-readable format. Users can then transfer this data to another service provider. This promotes user control and competition between service providers.

**Requirements:**

1. **Structured Format**: Data must be in structured format (JSON, CSV, XML), not PDF or images
2. **Machine-Readable**: Format must be processable by automated systems
3. **Complete Data**: Include all personal data, not just visible data
4. **Timely Response**: Provide data within one month (can be extended to three months)
5. **Secure Delivery**: Deliver data securely (encrypted download, secure email)

**Implementation:**

**1. Data Collection:**

Collect all user data from all sources (database, files, third-party services).

```javascript
// Collect all user data
async function collectUserData(userId) {
    const user = await User.findByPk(userId);
    
    return {
        profile: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            created_at: user.created_at,
            updated_at: user.updated_at
        },
        orders: await Order.findAll({
            where: { user_id: userId },
            include: [OrderItem]
        }),
        addresses: await Address.findAll({
            where: { user_id: userId }
        }),
        preferences: await Preference.findAll({
            where: { user_id: userId }
        }),
        consents: await Consent.findAll({
            where: { user_id: userId }
        }),
        activity_logs: await ActivityLog.findAll({
            where: { user_id: userId },
            limit: 1000  // Limit for size
        })
    };
}
```

**2. Data Export Endpoint:**

Provide API endpoint for data export.

```javascript
// Export user data
app.get('/users/:id/export', requireAuth, async (req, res) => {
    const userId = req.params.id;
    
    // Verify user can export their own data
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Collect all user data
    const userData = await collectUserData(userId);
    
    // Format as JSON (machine-readable)
    const jsonData = JSON.stringify(userData, null, 2);
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-${userId}-data-${Date.now()}.json"`);
    
    // Send data
    res.send(jsonData);
    
    // Log export (audit trail)
    await AuditLog.create({
        user_id: userId,
        action: 'export_data',
        timestamp: new Date()
    });
});
```

**3. Multiple Format Support:**

Support multiple export formats (JSON, CSV, XML).

```javascript
// Export in different formats
app.get('/users/:id/export', requireAuth, async (req, res) => {
    const format = req.query.format || 'json';  // json, csv, xml
    const userData = await collectUserData(req.params.id);
    
    let content, contentType, filename;
    
    switch (format) {
        case 'json':
            content = JSON.stringify(userData, null, 2);
            contentType = 'application/json';
            filename = `user-data.json`;
            break;
        case 'csv':
            content = convertToCSV(userData);
            contentType = 'text/csv';
            filename = `user-data.csv`;
            break;
        case 'xml':
            content = convertToXML(userData);
            contentType = 'application/xml';
            filename = `user-data.xml`;
            break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
});
```

**4. Asynchronous Export (Large Data):**

For large datasets, provide asynchronous export with download link.

```javascript
// Asynchronous export for large data
app.post('/users/:id/export', requireAuth, async (req, res) => {
    const userId = req.params.id;
    
    // Create export job
    const exportJob = await ExportJob.create({
        user_id: userId,
        status: 'pending',
        format: req.body.format || 'json'
    });
    
    // Queue export job
    await exportQueue.add('export-user-data', {
        userId,
        exportJobId: exportJob.id,
        format: req.body.format
    });
    
    res.json({
        message: 'Export started',
        export_id: exportJob.id,
        status_url: `/users/${userId}/export/${exportJob.id}/status`
    });
});

// Export job processor
exportQueue.process('export-user-data', async (job) => {
    const { userId, exportJobId, format } = job.data;
    
    // Collect data
    const userData = await collectUserData(userId);
    
    // Generate export file
    const exportFile = await generateExportFile(userData, format);
    
    // Upload to secure storage (S3)
    const downloadUrl = await uploadToS3(exportFile, `exports/${userId}/${exportJobId}.${format}`);
    
    // Update export job
    await ExportJob.update({
        status: 'completed',
        download_url: downloadUrl,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days
    }, {
        where: { id: exportJobId }
    });
});
```

**5. Secure Delivery:**

Deliver exports securely with expiration and access control.

```javascript
// Secure download with presigned URL
app.get('/users/:id/export/:exportId/download', requireAuth, async (req, res) => {
    const exportJob = await ExportJob.findByPk(req.params.exportId);
    
    // Verify ownership
    if (exportJob.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Check expiration
    if (exportJob.expires_at < new Date()) {
        return res.status(410).json({ error: 'Export expired' });
    }
    
    // Generate presigned URL (S3)
    const downloadUrl = await s3.getSignedUrl('getObject', {
        Bucket: 'exports',
        Key: exportJob.file_key,
        Expires: 3600  // 1 hour
    });
    
    res.redirect(downloadUrl);
});
```

**System Design Consideration**: Data portability is essential for **user control** and **competition** (users can switch services). Export must be **complete** (all personal data), **structured** (JSON, CSV, XML), and **machine-readable** (automated processing). For large datasets, use **asynchronous export** with secure download links. Ensure **secure delivery** (encrypted, expiration, access control) and **audit logging** (track data exports). Data portability promotes **user empowerment** and **interoperability** between services.

---

### Q4: Explain the concept of "consent management" under GDPR. How would you implement consent tracking and management in an Express.js application, including consent withdrawal?

**Answer:**

**Consent Management:**

Consent management involves obtaining, tracking, and managing user consent for data processing activities. Under GDPR, consent must be **freely given, specific, informed, and unambiguous**. Users must be able to withdraw consent at any time.

**Consent Requirements:**

1. **Explicit Consent**: Consent must be explicit (opt-in, not opt-out)
2. **Granular Consent**: Separate consent for different processing activities (marketing, analytics, cookies)
3. **Informed Consent**: Users must understand what they're consenting to
4. **Withdrawable**: Users can withdraw consent at any time
5. **Auditable**: Track when consent was given, what was consented to, and when withdrawn

**Implementation:**

**1. Consent Model:**

```javascript
const Consent = sequelize.define('Consent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    consent_type: {
        type: DataTypes.STRING,  // 'marketing', 'analytics', 'cookies', 'profiling'
        allowNull: false
    },
    granted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    granted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    consent_text: {
        type: DataTypes.TEXT,  // What user consented to
        allowNull: true
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    user_agent: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    indexes: [
        { fields: ['user_id', 'consent_type'] },
        { fields: ['granted'] }
    ]
});
```

**2. Grant Consent:**

```javascript
// Grant consent
app.post('/users/:id/consent', requireAuth, async (req, res) => {
    const { consent_type, granted, consent_text } = req.body;
    
    if (granted) {
        // Grant consent
        await Consent.create({
            user_id: req.params.id,
            consent_type,
            granted: true,
            granted_at: new Date(),
            consent_text,
            ip_address: req.ip,
            user_agent: req.get('user-agent')
        });
    } else {
        // Revoke consent
        await Consent.update({
            revoked_at: new Date()
        }, {
            where: {
                user_id: req.params.id,
                consent_type,
                granted: true,
                revoked_at: null
            }
        });
    }
    
    res.json({ message: 'Consent updated' });
});
```

**3. Check Consent:**

```javascript
// Check if user has consent
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

// Middleware to check consent
function requireConsent(consentType) {
    return async (req, res, next) => {
        const hasUserConsent = await hasConsent(req.user.id, consentType);
        
        if (!hasUserConsent) {
            return res.status(403).json({
                error: 'Consent required',
                consent_type: consentType
            });
        }
        
        next();
    };
}

// Usage
app.post('/marketing/email', 
    requireAuth,
    requireConsent('marketing'),
    sendMarketingEmail
);
```

**4. Consent Withdrawal:**

```javascript
// Withdraw consent
app.delete('/users/:id/consent/:consentType', requireAuth, async (req, res) => {
    const userId = req.params.id;
    const consentType = req.params.consentType;
    
    // Revoke consent
    await Consent.update({
        revoked_at: new Date()
    }, {
        where: {
            user_id: userId,
            consent_type: consentType,
            granted: true,
            revoked_at: null
        }
    });
    
    // Stop processing (e.g., unsubscribe from marketing)
    if (consentType === 'marketing') {
        await unsubscribeFromMarketing(userId);
    }
    
    res.json({ message: 'Consent withdrawn' });
});
```

**5. Consent History:**

```javascript
// Get consent history
app.get('/users/:id/consent', requireAuth, async (req, res) => {
    const consents = await Consent.findAll({
        where: { user_id: req.params.id },
        order: [['granted_at', 'DESC']]
    });
    
    res.json(consents);
});
```

**System Design Consideration**: Consent management is **critical for GDPR compliance**. Consent must be **explicit** (opt-in), **granular** (separate for each purpose), **informed** (clear explanation), and **withdrawable** (easy to revoke). Track consent **history** (when granted, when withdrawn) for **audit purposes**. Implement **automatic processing stops** when consent is withdrawn (unsubscribe from marketing, stop analytics tracking). Consent management is not just a legal requirement but a **trust-building mechanism** that gives users control over their data.

---

### Q5: Explain the concept of "data minimization" under GDPR and how it impacts database schema design in Express.js applications. How would you implement data minimization principles?

**Answer:**

**Data Minimization:**

Data minimization is the principle that personal data should be **adequate, relevant, and limited to what is necessary** for the purposes for which it is processed. Applications should collect and store only the minimum amount of personal data required to fulfill their purpose.

**Impact on Database Schema Design:**

Data minimization affects schema design by requiring:
1. **Selective Fields**: Only store fields that are necessary (don't collect "nice to have" data)
2. **Purpose Limitation**: Each field must have a clear purpose
3. **Retention Policies**: Delete data when no longer needed
4. **Anonymization**: Remove identifying information when possible
5. **Aggregation**: Store aggregated data instead of individual records when possible

**Implementation Strategies:**

**1. Minimal Schema Design:**

Design schemas to collect only necessary data.

```javascript
// BAD: Collecting unnecessary data
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    address: DataTypes.STRING,
    date_of_birth: DataTypes.DATE,  // Not needed for account creation
    gender: DataTypes.STRING,  // Not needed
    occupation: DataTypes.STRING,  // Not needed
    income: DataTypes.INTEGER  // Not needed
});

// GOOD: Minimal data collection
const User = sequelize.define('User', {
    email: DataTypes.STRING,  // Required for account
    name: DataTypes.STRING,   // Required for personalization
    // Only collect additional data when actually needed
});
```

**2. Conditional Data Collection:**

Collect additional data only when needed for specific features.

```javascript
// Collect phone only when user enables 2FA
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    phone: DataTypes.STRING,  // Nullable, collected only if 2FA enabled
    two_factor_enabled: DataTypes.BOOLEAN
});

// Collect address only when user places order
const Address = sequelize.define('Address', {
    user_id: DataTypes.INTEGER,
    address: DataTypes.STRING,
    // Collected only when needed for shipping
});
```

**3. Data Retention Policies:**

Automatically delete data when retention period expires.

```javascript
// Soft delete with retention period
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    deleted_at: DataTypes.DATE,
    retention_until: DataTypes.DATE  // Delete after this date
});

// Background job to delete expired data
cron.schedule('0 2 * * *', async () => {  // Daily at 2 AM
    await User.destroy({
        where: {
            deleted_at: { [Op.not]: null },
            retention_until: { [Op.lt]: new Date() }
        }
    });
});
```

**4. Anonymization:**

Anonymize data instead of storing identifiable information when possible.

```javascript
// Store anonymized analytics instead of individual user data
const Analytics = sequelize.define('Analytics', {
    event_type: DataTypes.STRING,
    user_id_hash: DataTypes.STRING,  // Hashed user ID (anonymized)
    timestamp: DataTypes.DATE,
    // No direct user identification
});

// Hash user ID for analytics
function hashUserId(userId) {
    return crypto.createHash('sha256').update(userId.toString()).digest('hex');
}
```

**5. Aggregation:**

Store aggregated data instead of individual records when detailed data is not needed.

```javascript
// Store daily aggregates instead of individual events
const DailyAnalytics = sequelize.define('DailyAnalytics', {
    date: DataTypes.DATE,
    event_type: DataTypes.STRING,
    count: DataTypes.INTEGER,  // Aggregated count
    // No individual user data
});

// Aggregate and delete individual events
async function aggregateAndDelete() {
    // Aggregate events
    const aggregates = await Event.findAll({
        attributes: [
            'event_type',
            [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['event_type', sequelize.fn('DATE', sequelize.col('created_at'))]
    });
    
    // Store aggregates
    await DailyAnalytics.bulkCreate(aggregates);
    
    // Delete individual events (older than 30 days)
    await Event.destroy({
        where: {
            created_at: { [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
    });
}
```

**System Design Consideration**: Data minimization is a **fundamental GDPR principle** that requires applications to collect and store only necessary data. This impacts **schema design** (minimal fields), **data collection** (conditional collection), **retention policies** (automatic deletion), and **data processing** (anonymization, aggregation). Data minimization reduces **security risk** (less data to protect), **storage costs** (less data to store), and **compliance burden** (less data to manage). It's not just a legal requirement but a **best practice** for efficient and secure data management.

