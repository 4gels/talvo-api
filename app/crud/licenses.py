# -*- coding: utf-8 -*-

"""
Talvo Admin API - Licenses CRUD
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException, status

from app.models import Tenant, User, ActivityLog
from app.schemas import LicenseGenerate, LicenseResponse
from app.crud.tenants import create_tenant


def generate_license(db: Session, data: LicenseGenerate, user_id: int) -> LicenseResponse:
    """توليد مفتاح تفعيل جديد"""
    
    # ✅ إنشاء مستأجر جديد مع المفتاح
    from app.schemas import TenantCreate
    
    tenant_data = TenantCreate(
        name=data.name,
        arabic_name=data.arabic_name,
        email=data.email,
        phone=data.phone,
        address=data.address,
        subscription_plan=data.subscription_plan,
        max_users=data.max_users,
        subscription_days=data.subscription_days,
        is_active=True,
        can_manage_products=data.can_manage_products,
        can_manage_sales=data.can_manage_sales,
        can_manage_purchases=data.can_manage_purchases,
        can_manage_inventory=data.can_manage_inventory,
        can_manage_customers=data.can_manage_customers,
        can_manage_suppliers=data.can_manage_suppliers,
        can_manage_employees=data.can_manage_employees,
        can_manage_reports=data.can_manage_reports,
        can_manage_settings=data.can_manage_settings,
        can_manage_backup=data.can_manage_backup,
        can_export_data=data.can_export_data,
        can_import_data=data.can_import_data,
        can_manage_roles=data.can_manage_roles,
        can_view_audit_log=data.can_view_audit_log,
    )
    
    tenant = create_tenant(db, tenant_data, user_id)
    
    ActivityLog.log(
        db=db,
        user_id=user_id,
        action="generate_license",
        module="admin",
        description=f"تم توليد مفتاح جديد للمستأجر: {tenant.name}"
    )
    
    return LicenseResponse(
        success=True,
        license_key=tenant.license_key,
        tenant=tenant,
        admin_password="admin123",
        message=f"تم توليد المفتاح بنجاح للمستأجر {tenant.name}"
    )


def validate_license(db: Session, license_key: str):
    """التحقق من صحة مفتاح التفعيل"""
    
    tenant = db.query(Tenant).filter(
        Tenant.license_key == license_key,
        Tenant.is_deleted == False
    ).first()
    
    if not tenant:
        return {
            "valid": False,
            "message": "مفتاح التفعيل غير صحيح"
        }
    
    if not tenant.is_active:
        return {
            "valid": False,
            "message": "المفتاح غير مفعل"
        }
    
    if tenant.subscription_expiry and tenant.subscription_expiry < datetime.utcnow():
        return {
            "valid": False,
            "message": "انتهت صلاحية الاشتراك",
            "expiry_date": tenant.subscription_expiry.isoformat()
        }
    
    days_left = None
    if tenant.subscription_expiry:
        days_left = (tenant.subscription_expiry - datetime.utcnow()).days
    
    return {
        "valid": True,
        "tenant": tenant,
        "message": "المفتاح صالح",
        "expiry_date": tenant.subscription_expiry.isoformat() if tenant.subscription_expiry else None,
        "days_left": days_left
    }


def regenerate_license(db: Session, tenant_id: int, user_id: int):
    """إعادة توليد مفتاح التفعيل لمستأجر"""
    
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id,
        Tenant.is_deleted == False
    ).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستأجر غير موجود"
        )
    
    # ✅ توليد مفتاح جديد
    from app.core.license import LicenseManager
    license_info = LicenseManager.generate_license_key(tenant.name)
    
    old_key = tenant.license_key
    tenant.license_key = license_info['license_key']
    db.commit()
    
    ActivityLog.log(
        db=db,
        user_id=user_id,
        action="regenerate_license",
        module="admin",
        description=f"تم إعادة توليد مفتاح للمستأجر {tenant.name} (القديم: {old_key[:8]}...)"
    )
    
    return {
        "success": True,
        "license_key": tenant.license_key,
        "message": "تم إعادة توليد المفتاح بنجاح"
    }