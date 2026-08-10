# -*- coding: utf-8 -*-

"""
Talvo Admin API - Tenants CRUD
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException, status

from app.models import Tenant, User, ActivityLog
from app.schemas import TenantCreate, TenantUpdate
from app.core.license import LicenseManager
from app.core.security import get_password_hash


def get_tenants(db: Session, skip: int = 0, limit: int = 100) -> List[Tenant]:
    return db.query(Tenant).filter(
        Tenant.is_deleted == False
    ).offset(skip).limit(limit).all()


def get_tenant(db: Session, tenant_id: int) -> Optional[Tenant]:
    return db.query(Tenant).filter(
        Tenant.id == tenant_id,
        Tenant.is_deleted == False
    ).first()


def create_tenant(db: Session, tenant_data: TenantCreate, user_id: int) -> Tenant:
    existing = db.query(Tenant).filter(
        Tenant.name == tenant_data.name,
        Tenant.is_deleted == False
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="اسم المستأجر موجود بالفعل"
        )
    
    license_info = LicenseManager.generate_license_key(
        tenant_data.name,
        tenant_data.subscription_days
    )
    
    db_name = LicenseManager.create_db_name(license_info['license_key'])
    expiry_date = datetime.utcnow() + timedelta(days=tenant_data.subscription_days)
    
    tenant = Tenant(
        name=tenant_data.name,
        arabic_name=tenant_data.arabic_name,
        license_key=license_info['license_key'],
        db_name=db_name,
        phone=tenant_data.phone,
        email=tenant_data.email,
        address=tenant_data.address,
        tax_number=tenant_data.tax_number,
        commercial_register=tenant_data.commercial_register,
        currency=tenant_data.currency,
        timezone=tenant_data.timezone,
        is_active=tenant_data.is_active,
        max_users=tenant_data.max_users,
        max_storage_mb=tenant_data.max_storage_mb,
        subscription_plan=tenant_data.subscription_plan,
        subscription_expiry=expiry_date,
        can_manage_products=tenant_data.can_manage_products,
        can_manage_sales=tenant_data.can_manage_sales,
        can_manage_purchases=tenant_data.can_manage_purchases,
        can_manage_inventory=tenant_data.can_manage_inventory,
        can_manage_customers=tenant_data.can_manage_customers,
        can_manage_suppliers=tenant_data.can_manage_suppliers,
        can_manage_employees=tenant_data.can_manage_employees,
        can_manage_reports=tenant_data.can_manage_reports,
        can_manage_settings=tenant_data.can_manage_settings,
        can_manage_backup=tenant_data.can_manage_backup,
        can_export_data=tenant_data.can_export_data,
        can_import_data=tenant_data.can_import_data,
        can_manage_roles=tenant_data.can_manage_roles,
        can_view_audit_log=tenant_data.can_view_audit_log,
    )
    
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    # ✅ إنشاء مستخدم مدير للمستأجر
    admin_password = "admin123"
    admin_user = User(
        username="admin",
        email=tenant.email or f"admin@{tenant.name}.com",
        full_name="مدير النظام",
        password_hash=get_password_hash(admin_password),
        is_admin=True,
        is_system_admin_flag=False,
        is_active=True,
        tenant_id=tenant.id
    )
    
    db.add(admin_user)
    db.commit()
    
    # ✅ تسجيل النشاط
    ActivityLog.log(
        db=db,
        user_id=user_id,
        action="create_tenant",
        module="admin",
        description=f"تم إنشاء مستأجر جديد: {tenant.name} (المفتاح: {tenant.license_key[:8]}...)"
    )
    
    return tenant


def update_tenant(db: Session, tenant_id: int, tenant_data: TenantUpdate, user_id: int) -> Tenant:
    tenant = get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستأجر غير موجود"
        )
    
    # ✅ تحديث الحقول
    if tenant_data.name is not None:
        tenant.name = tenant_data.name
    if tenant_data.arabic_name is not None:
        tenant.arabic_name = tenant_data.arabic_name
    if tenant_data.phone is not None:
        tenant.phone = tenant_data.phone
    if tenant_data.email is not None:
        tenant.email = tenant_data.email
    if tenant_data.address is not None:
        tenant.address = tenant_data.address
    if tenant_data.tax_number is not None:
        tenant.tax_number = tenant_data.tax_number
    if tenant_data.commercial_register is not None:
        tenant.commercial_register = tenant_data.commercial_register
    if tenant_data.currency is not None:
        tenant.currency = tenant_data.currency
    if tenant_data.timezone is not None:
        tenant.timezone = tenant_data.timezone
    if tenant_data.is_active is not None:
        tenant.is_active = tenant_data.is_active
    if tenant_data.max_users is not None:
        tenant.max_users = tenant_data.max_users
    if tenant_data.max_storage_mb is not None:
        tenant.max_storage_mb = tenant_data.max_storage_mb
    if tenant_data.subscription_plan is not None:
        tenant.subscription_plan = tenant_data.subscription_plan
    if tenant_data.subscription_days is not None:
        tenant.subscription_expiry = datetime.utcnow() + timedelta(days=tenant_data.subscription_days)
    
    # ✅ تحديث الصلاحيات
    if tenant_data.can_manage_products is not None:
        tenant.can_manage_products = tenant_data.can_manage_products
    if tenant_data.can_manage_sales is not None:
        tenant.can_manage_sales = tenant_data.can_manage_sales
    if tenant_data.can_manage_purchases is not None:
        tenant.can_manage_purchases = tenant_data.can_manage_purchases
    if tenant_data.can_manage_inventory is not None:
        tenant.can_manage_inventory = tenant_data.can_manage_inventory
    if tenant_data.can_manage_customers is not None:
        tenant.can_manage_customers = tenant_data.can_manage_customers
    if tenant_data.can_manage_suppliers is not None:
        tenant.can_manage_suppliers = tenant_data.can_manage_suppliers
    if tenant_data.can_manage_employees is not None:
        tenant.can_manage_employees = tenant_data.can_manage_employees
    if tenant_data.can_manage_reports is not None:
        tenant.can_manage_reports = tenant_data.can_manage_reports
    if tenant_data.can_manage_settings is not None:
        tenant.can_manage_settings = tenant_data.can_manage_settings
    if tenant_data.can_manage_backup is not None:
        tenant.can_manage_backup = tenant_data.can_manage_backup
    if tenant_data.can_export_data is not None:
        tenant.can_export_data = tenant_data.can_export_data
    if tenant_data.can_import_data is not None:
        tenant.can_import_data = tenant_data.can_import_data
    if tenant_data.can_manage_roles is not None:
        tenant.can_manage_roles = tenant_data.can_manage_roles
    if tenant_data.can_view_audit_log is not None:
        tenant.can_view_audit_log = tenant_data.can_view_audit_log
    
    db.commit()
    db.refresh(tenant)
    
    ActivityLog.log(
        db=db,
        user_id=user_id,
        action="update_tenant",
        module="admin",
        description=f"تم تحديث المستأجر: {tenant.name}"
    )
    
    return tenant


def delete_tenant(db: Session, tenant_id: int, force: bool, user_id: int):
    tenant = get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستأجر غير موجود"
        )
    
    if tenant.total_users > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"لا يمكن حذف المستأجر لأنه يحتوي على {tenant.total_users} مستخدمين نشطين"
        )
    
    tenant.is_deleted = True
    db.commit()
    
    ActivityLog.log(
        db=db,
        user_id=user_id,
        action="delete_tenant",
        module="admin",
        description=f"تم حذف المستأجر: {tenant.name}"
    )
    
    return {"success": True, "message": f"تم حذف المستأجر {tenant.name} بنجاح"}


def toggle_status(db: Session, tenant_id: int, user_id: int):
    tenant = get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستأجر غير موجود"
        )
    
    tenant.is_active = not tenant.is_active
    db.commit()
    
    status = "نشط" if tenant.is_active else "غير نشط"
    
    ActivityLog.log(
        db=db,
        user_id=user_id,
        action="toggle_tenant_status",
        module="admin",
        description=f"تم تغيير حالة المستأجر {tenant.name} إلى {status}"
    )
    
    return {"success": True, "message": f"تم تغيير حالة المستأجر إلى {status}"}