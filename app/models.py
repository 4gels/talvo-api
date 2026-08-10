# -*- coding: utf-8 -*-

"""
Talvo Admin API - SQLAlchemy Models
(مرتبطة بقاعدة البيانات الموجودة)
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


# =============================================
# ✅ نموذج المستأجر (Tenant)
# =============================================

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    arabic_name = Column(String(100), nullable=True)
    license_key = Column(String(64), unique=True, nullable=False)
    db_name = Column(String(100), unique=True, nullable=False)
    
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    tax_number = Column(String(50), nullable=True)
    commercial_register = Column(String(50), nullable=True)
    
    currency = Column(String(3), default="EGP")
    timezone = Column(String(50), default="Africa/Cairo")
    logo_path = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    
    max_users = Column(Integer, default=5)
    max_storage_mb = Column(Integer, default=100)
    subscription_plan = Column(String(20), default="basic")
    subscription_expiry = Column(DateTime, nullable=True)
    
    can_manage_products = Column(Boolean, default=True)
    can_manage_sales = Column(Boolean, default=True)
    can_manage_purchases = Column(Boolean, default=True)
    can_manage_inventory = Column(Boolean, default=True)
    can_manage_customers = Column(Boolean, default=True)
    can_manage_suppliers = Column(Boolean, default=True)
    can_manage_employees = Column(Boolean, default=True)
    can_manage_reports = Column(Boolean, default=True)
    can_manage_settings = Column(Boolean, default=False)
    can_manage_backup = Column(Boolean, default=False)
    can_export_data = Column(Boolean, default=False)
    can_import_data = Column(Boolean, default=False)
    can_manage_roles = Column(Boolean, default=False)
    can_view_audit_log = Column(Boolean, default=False)
    
    total_users = Column(Integer, default=0)
    total_storage_used_mb = Column(Integer, default=0)
    last_activity = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    
    sync_id = Column(String(36), unique=True, default=generate_uuid)
    is_deleted = Column(Boolean, default=False)
    sync_status = Column(String(20), default="pending")
    synced_at = Column(DateTime, nullable=True)


# =============================================
# ✅ نموذج المستخدم (User)
# =============================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    full_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_system_admin_flag = Column(Boolean, default=False)  # ✅ مطابق لـ models.py
    
    created_at = Column(DateTime, server_default=func.now())
    last_login = Column(DateTime, nullable=True)
    
    employee_id = Column(Integer, nullable=True)
    role_id = Column(Integer, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    sync_id = Column(String(36), unique=True, default=generate_uuid)
    is_deleted = Column(Boolean, default=False)
    sync_status = Column(String(20), default="pending")
    synced_at = Column(DateTime, nullable=True)
    
    tenant = relationship("Tenant", backref="users")


# =============================================
# ✅ نموذج سجل النشاطات (ActivityLog)
# =============================================

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    module = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(200), nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    sync_id = Column(String(36), unique=True, default=generate_uuid)
    is_deleted = Column(Boolean, default=False)
    sync_status = Column(String(20), default="pending")
    synced_at = Column(DateTime, nullable=True)
    
    user = relationship("User", backref="activities")
    tenant = relationship("Tenant", backref="activities")

    @classmethod
    def log(cls, db, user_id, action, module, description, ip_address=None, user_agent=None, tenant_id=None):
        log = cls(
            user_id=user_id,
            action=action,
            module=module,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            tenant_id=tenant_id
        )
        db.add(log)
        db.commit()
        return log