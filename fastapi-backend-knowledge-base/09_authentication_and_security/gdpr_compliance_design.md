# GDPR Compliance Design: Complete Implementation Guide

Designing for GDPR compliance ensures data privacy and regulatory compliance. This guide covers comprehensive GDPR implementation with code examples and best practices.

## Understanding GDPR Requirements

**What is GDPR?**
General Data Protection Regulation - EU law governing data protection and privacy.

**Key principles:**
- Lawfulness, fairness, and transparency
- Purpose limitation
- Data minimization
- Accuracy
- Storage limitation
- Integrity and confidentiality
- Accountability

**Individual rights:**
- Right to access (Article 15)
- Right to rectification (Article 16)
- Right to erasure (Article 17)
- Right to data portability (Article 20)
- Right to object (Article 21)

## Step 1: Data Minimization

### Only Collect Necessary Data

```python
from pydantic import BaseModel, Field
from typing import Optional

class UserRegistration(BaseModel):
    """Minimal data collection - only what's necessary."""
    
    # Required for account creation
    email: EmailStr = Field(..., description="Required for account management")
    password: str = Field(..., min_length=8)
    
    # Optional - only if needed
    name: Optional[str] = Field(None, description="Optional for personalization")
    
    # Don't collect:
    # - Date of birth (unless age verification needed)
    # - Address (unless shipping needed)
    # - Phone number (unless 2FA needed)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123",
                "name": "John Doe"  # Optional
            }
        }

# Only request data when actually needed
@router.post("/checkout")
async def checkout(
    shipping_address: ShippingAddress,  # Only collect when needed
    billing_info: BillingInfo
):
    """Collect shipping info only during checkout."""
    # Process order with minimal data
    pass
```

### Purpose Limitation

```python
class DataPurpose(Base):
    """Track why data is collected."""
    __tablename__ = "data_purposes"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    data_type = Column(String(100), nullable=False)  # 'email', 'phone', 'address'
    purpose = Column(String(255), nullable=False)  # 'account_management', 'shipping', 'marketing'
    legal_basis = Column(String(100))  # 'consent', 'contract', 'legal_obligation'
    collected_at = Column(DateTime, default=datetime.utcnow)

# Track data collection purposes
async def collect_user_data(
    user_id: int,
    data_type: str,
    purpose: str,
    legal_basis: str,
    db: AsyncSession
):
    """Collect data with purpose tracking."""
    # Store purpose
    purpose_record = DataPurpose(
        user_id=user_id,
        data_type=data_type,
        purpose=purpose,
        legal_basis=legal_basis
    )
    db.add(purpose_record)
    await db.commit()
```

## Step 2: Right to Access (Article 15)

### Data Export Endpoint

```python
from fastapi.responses import JSONResponse

@router.get("/users/{user_id}/data-export", response_class=JSONResponse)
async def export_user_data(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all user data (GDPR Right to Access).
    
    Users can request all their personal data in structured format.
    """
    # Verify authorization
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Collect all user data
    user = await db.get(User, user_id)
    
    # Get related data
    orders = await db.execute(
        select(Order).where(Order.user_id == user_id)
    )
    
    applications = await db.execute(
        select(Application).where(Application.user_id == user_id)
    )
    
    activity_logs = await db.execute(
        select(ActivityLog).where(ActivityLog.user_id == user_id)
    )
    
    # Compile export data
    export_data = {
        "user_id": user_id,
        "export_date": datetime.utcnow().isoformat(),
        "profile": {
            "email": user.email,
            "name": user.name,
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None
        },
        "orders": [
            {
                "id": order.id,
                "total": float(order.total_amount),
                "status": order.status,
                "created_at": order.created_at.isoformat()
            }
            for order in orders.scalars().all()
        ],
        "applications": [
            {
                "id": app.id,
                "job_id": app.job_id,
                "status": app.status,
                "submitted_at": app.submitted_at.isoformat()
            }
            for app in applications.scalars().all()
        ],
        "activity_logs": [
            {
                "action": log.action,
                "timestamp": log.timestamp.isoformat(),
                "ip_address": log.ip_address
            }
            for log in activity_logs.scalars().all()
        ],
        "data_sources": [
            {
                "source": "database",
                "tables": ["users", "orders", "applications"]
            }
        ]
    }
    
    # Log export request
    await log_data_access(
        user_id=user_id,
        accessed_by=current_user.id,
        access_type="export",
        reason="GDPR data export request"
    )
    
    return export_data
```

### Automated Data Export

```python
class DataExportService:
    """Service for generating GDPR-compliant data exports."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def generate_export(self, user_id: int) -> dict:
        """Generate comprehensive data export."""
        export = {
            "metadata": {
                "user_id": user_id,
                "export_date": datetime.utcnow().isoformat(),
                "format_version": "1.0"
            },
            "personal_data": await self._export_personal_data(user_id),
            "activity_data": await self._export_activity_data(user_id),
            "transaction_data": await self._export_transaction_data(user_id),
            "communication_data": await self._export_communication_data(user_id)
        }
        
        return export
    
    async def _export_personal_data(self, user_id: int) -> dict:
        """Export personal information."""
        user = await self.db.get(User, user_id)
        
        return {
            "profile": {
                "email": user.email,
                "name": user.name,
                "phone": user.phone if hasattr(user, 'phone') else None
            },
            "preferences": {
                "language": user.language_preference if hasattr(user, 'language_preference') else None,
                "timezone": user.timezone if hasattr(user, 'timezone') else None
            }
        }
    
    async def _export_activity_data(self, user_id: int) -> dict:
        """Export user activity logs."""
        logs = await self.db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .order_by(ActivityLog.timestamp.desc())
            .limit(1000)
        )
        
        return {
            "recent_activities": [
                {
                    "action": log.action,
                    "timestamp": log.timestamp.isoformat(),
                    "ip_address": log.ip_address
                }
                for log in logs.scalars().all()
            ]
        }
```

## Step 3: Right to Erasure (Article 17)

### Data Deletion and Anonymization

```python
class DataDeletionService:
    """Service for GDPR-compliant data deletion."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def delete_user_data(self, user_id: int, reason: str):
        """
        Delete user data (GDPR Right to Erasure).
        
        Strategy:
        1. Anonymize data (keep for legal/compliance reasons)
        2. Delete from non-essential systems
        3. Retain only what's legally required
        """
        user = await self.db.get(User, user_id)
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Step 1: Anonymize personal data
        await self._anonymize_user(user_id)
        
        # Step 2: Delete from non-essential systems
        await self._delete_application_data(user_id)
        
        # Step 3: Mark as deleted
        user.deleted_at = datetime.utcnow()
        user.is_active = False
        
        await self.db.commit()
        
        # Log deletion
        await log_data_access(
            user_id=user_id,
            accessed_by=user_id,
            access_type="deletion",
            reason=reason
        )
    
    async def _anonymize_user(self, user_id: int):
        """Anonymize user personal data."""
        user = await self.db.get(User, user_id)
        
        # Anonymize email
        user.email = f"deleted_{user_id}@deleted.local"
        
        # Anonymize name
        user.name = "Deleted User"
        
        # Anonymize phone
        if hasattr(user, 'phone') and user.phone:
            user.phone = None
        
        # Clear other PII
        if hasattr(user, 'address') and user.address:
            user.address = None
        
        # Store deletion timestamp
        user.data_deleted_at = datetime.utcnow()
    
    async def _delete_application_data(self, user_id: int):
        """Delete user data from applications."""
        # Delete resume/application materials
        await self.db.execute(
            delete(Resume).where(Resume.user_id == user_id)
        )
        
        # Delete application responses
        await self.db.execute(
            delete(ApplicationResponse).where(ApplicationResponse.user_id == user_id)
        )

@router.delete("/users/{user_id}/data")
async def delete_user_data(
    user_id: int,
    reason: str,
    current_user: User = Depends(get_current_user),
    deletion_service: DataDeletionService = Depends(get_deletion_service)
):
    """Delete user data (GDPR Right to Erasure)."""
    # Verify authorization
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await deletion_service.delete_user_data(user_id, reason)
    
    return {"status": "deleted", "message": "Your data has been deleted"}
```

### Soft Delete with Retention

```python
class User(Base):
    """User with GDPR-compliant deletion."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255))
    name = Column(String(255))
    
    # Deletion tracking
    deleted_at = Column(DateTime, nullable=True, index=True)
    deletion_reason = Column(Text, nullable=True)
    data_retention_until = Column(DateTime, nullable=True)  # When data can be permanently deleted
    
    # Anonymized flag
    is_anonymized = Column(Boolean, default=False)

async def schedule_data_deletion(user_id: int, retention_days: int = 30):
    """Schedule permanent deletion after retention period."""
    user = await db.get(User, user_id)
    
    # Set retention period (e.g., 30 days for legal/compliance)
    user.data_retention_until = datetime.utcnow() + timedelta(days=retention_days)
    
    await db.commit()
    
    # Schedule background task for permanent deletion
    celery_app.send_task(
        "tasks.permanent_delete_user_data",
        args=[user_id],
        countdown=retention_days * 24 * 3600  # After retention period
    )
```

## Step 4: Right to Rectification (Article 16)

### Data Update Endpoint

```python
@router.put("/users/{user_id}/data")
async def update_user_data(
    user_id: int,
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user data (GDPR Right to Rectification).
    
    Users can correct inaccurate personal data.
    """
    # Verify authorization
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.get(User, user_id)
    
    # Update fields
    if updates.name is not None:
        user.name = updates.name
    if updates.email is not None:
        user.email = updates.email
    if updates.phone is not None:
        user.phone = updates.phone
    
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Log update
    await log_data_access(
        user_id=user_id,
        accessed_by=current_user.id,
        access_type="update",
        reason="User requested data correction"
    )
    
    return {"status": "updated", "message": "Your data has been updated"}
```

## Step 5: Right to Data Portability (Article 20)

### Machine-Readable Export

```python
@router.get("/users/{user_id}/data-portable")
async def export_portable_data(
    user_id: int,
    format: str = "json",  # 'json', 'csv', 'xml'
    current_user: User = Depends(get_current_user)
):
    """
    Export data in portable format (GDPR Right to Data Portability).
    
    Machine-readable format for easy transfer.
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    export_service = DataExportService(db)
    data = await export_service.generate_export(user_id)
    
    if format == "json":
        return JSONResponse(content=data)
    elif format == "csv":
        # Convert to CSV format
        csv_data = convert_to_csv(data)
        return Response(content=csv_data, media_type="text/csv")
    elif format == "xml":
        xml_data = convert_to_xml(data)
        return Response(content=xml_data, media_type="application/xml")
```

## Step 6: Consent Management

### Consent Tracking

```python
class Consent(Base):
    """Track user consent for data processing."""
    __tablename__ = "consents"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    consent_type = Column(String(100), nullable=False)  # 'marketing', 'analytics', 'cookies'
    granted = Column(Boolean, default=False)
    granted_at = Column(DateTime, nullable=True)
    withdrawn_at = Column(DateTime, nullable=True)
    
    # Legal basis
    legal_basis = Column(String(100))  # 'consent', 'legitimate_interest'
    
    # Version tracking
    consent_version = Column(String(20))  # Version of consent terms
    ip_address = Column(String(45))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_consent_user_type', 'user_id', 'consent_type'),
    )

async def record_consent(
    user_id: int,
    consent_type: str,
    granted: bool,
    legal_basis: str,
    consent_version: str,
    ip_address: Optional[str] = None
):
    """Record user consent."""
    consent = Consent(
        user_id=user_id,
        consent_type=consent_type,
        granted=granted,
        legal_basis=legal_basis,
        consent_version=consent_version,
        ip_address=ip_address,
        granted_at=datetime.utcnow() if granted else None
    )
    
    db.add(consent)
    await db.commit()

@router.post("/users/{user_id}/consent")
async def update_consent(
    user_id: int,
    consent_type: str,
    granted: bool,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Update user consent."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403)
    
    # Record consent
    await record_consent(
        user_id=user_id,
        consent_type=consent_type,
        granted=granted,
        legal_basis="consent",
        consent_version="1.0",
        ip_address=request.client.host
    )
    
    return {"status": "consent_updated", "granted": granted}
```

## Step 7: Audit Logging

### Comprehensive Audit Trail

```python
class DataAccessLog(Base):
    """Log all data access for GDPR compliance."""
    __tablename__ = "data_access_logs"
    
    id = Column(Integer, primary_key=True)
    
    # Who
    data_subject_id = Column(Integer, index=True)  # Whose data
    accessed_by = Column(Integer, index=True)  # Who accessed
    
    # What
    access_type = Column(String(50), nullable=False)  # 'read', 'update', 'delete', 'export'
    resource_type = Column(String(100))  # 'user', 'order', 'application'
    resource_id = Column(Integer)
    
    # Fields accessed
    fields_accessed = Column(JSON)  # ['email', 'phone', 'orders']
    
    # Why
    purpose = Column(Text)  # Why data was accessed
    legal_basis = Column(String(100))  # 'consent', 'contract', 'legal_obligation'
    
    # When and where
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    
    # Result
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    __table_args__ = (
        Index('idx_access_logs_subject_timestamp', 'data_subject_id', 'timestamp'),
        Index('idx_access_logs_accessed_by', 'accessed_by', 'timestamp'),
    )

async def log_data_access(
    data_subject_id: int,
    accessed_by: int,
    access_type: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    fields_accessed: Optional[List[str]] = None,
    purpose: Optional[str] = None,
    legal_basis: Optional[str] = None,
    ip_address: Optional[str] = None,
    success: bool = True
):
    """Log data access for audit trail."""
    log_entry = DataAccessLog(
        data_subject_id=data_subject_id,
        accessed_by=accessed_by,
        access_type=access_type,
        resource_type=resource_type,
        resource_id=resource_id,
        fields_accessed=fields_accessed or [],
        purpose=purpose,
        legal_basis=legal_basis,
        ip_address=ip_address,
        success=success,
        timestamp=datetime.utcnow()
    )
    
    db.add(log_entry)
    await db.commit()
```

## Step 8: FastAPI Integration

### GDPR-Compliant Endpoints

```python
@router.get("/users/{user_id}/rights")
async def get_data_rights(user_id: int):
    """Inform users of their GDPR rights."""
    return {
        "rights": [
            {
                "name": "Right to Access",
                "description": "You can request all your personal data",
                "endpoint": f"/users/{user_id}/data-export"
            },
            {
                "name": "Right to Rectification",
                "description": "You can correct inaccurate data",
                "endpoint": f"/users/{user_id}/data"
            },
            {
                "name": "Right to Erasure",
                "description": "You can request deletion of your data",
                "endpoint": f"/users/{user_id}/data"
            },
            {
                "name": "Right to Data Portability",
                "description": "You can export your data in portable format",
                "endpoint": f"/users/{user_id}/data-portable"
            }
        ]
    }

@router.get("/users/{user_id}/data-usage")
async def get_data_usage_info(user_id: int):
    """Inform users how their data is used."""
    # Get all purposes for user data
    purposes = await db.execute(
        select(DataPurpose).where(DataPurpose.user_id == user_id)
    )
    
    return {
        "data_collected": [
            {
                "type": purpose.data_type,
                "purpose": purpose.purpose,
                "legal_basis": purpose.legal_basis,
                "collected_at": purpose.collected_at.isoformat()
            }
            for purpose in purposes.scalars().all()
        ]
    }
```

## Best Practices

1. **✅ Minimize data collection**: Only collect what's necessary
2. **✅ Track purposes**: Document why data is collected
3. **✅ Implement all rights**: Access, rectification, erasure, portability
4. **✅ Audit everything**: Log all data access
5. **✅ Obtain consent**: Track and manage consent
6. **✅ Data retention**: Set retention periods and delete when expired

## Summary

GDPR compliance provides:
- ✅ Legal compliance
- ✅ User trust
- ✅ Data protection
- ✅ Audit capabilities

Implement comprehensive GDPR compliance for production applications!
