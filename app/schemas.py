# -*- coding: utf-8 -*-

"""
Talvo Admin API - Pydantic Schemas
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# =============================================
# ✅ المستأجرين (Tenants)
# =============================================

class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    arabic_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    tax_number: Optional[str] = Field(None, max_length=50)
    commercial_register: Optional[str] = Field(None, max_length=50)
    currency: str = "EGP"
    timezone: str = "Africa/Cairo"
    is_active: bool = True
    max_users: int = Field(5, ge=1, le=1000)
    max_storage_mb: int = Field(100, ge=10, le=100000)
    subscription_plan: str = Field("basic", pattern="^(basic|pro|enterprise)$")


class TenantCreate(TenantBase):
    subscription_days: int = Field(365, ge=30, le=3650)
    can_manage_products: bool = True
    can_manage_sales: bool = True
    can_manage_purchases: bool = True
    can_manage_inventory: bool = True
    can_manage_customers: bool = True
    can_manage_suppliers: bool = True
    can_manage_employees: bool = True
    can_manage_reports: bool = True
    can_manage_settings: bool = False
    can_manage_backup: bool = False
    can_export_data: bool = False
    can_import_data: bool = False
    can_manage_roles: bool = False
    can_view_audit_log: bool = False


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    arabic_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    tax_number: Optional[str] = Field(None, max_length=50)
    commercial_register: Optional[str] = Field(None, max_length=50)
    currency: Optional[str] = "EGP"
    timezone: Optional[str] = "Africa/Cairo"
    is_active: Optional[bool] = None
    max_users: Optional[int] = Field(None, ge=1, le=1000)
    max_storage_mb: Optional[int] = Field(None, ge=10, le=100000)
    subscription_plan: Optional[str] = Field(None, pattern="^(basic|pro|enterprise)$")
    subscription_days: Optional[int] = Field(None, ge=30, le=3650)
    can_manage_products: Optional[bool] = None
    can_manage_sales: Optional[bool] = None
    can_manage_purchases: Optional[bool] = None
    can_manage_inventory: Optional[bool] = None
    can_manage_customers: Optional[bool] = None
    can_manage_suppliers: Optional[bool] = None
    can_manage_employees: Optional[bool] = None
    can_manage_reports: Optional[bool] = None
    can_manage_settings: Optional[bool] = None
    can_manage_backup: Optional[bool] = None
    can_export_data: Optional[bool] = None
    can_import_data: Optional[bool] = None
    can_manage_roles: Optional[bool] = None
    can_view_audit_log: Optional[bool] = None


class TenantResponse(TenantBase):
    id: int
    license_key: str
    db_name: str
    total_users: int
    total_storage_used_mb: int
    last_activity: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    can_manage_products: bool
    can_manage_sales: bool
    can_manage_purchases: bool
    can_manage_inventory: bool
    can_manage_customers: bool
    can_manage_suppliers: bool
    can_manage_employees: bool
    can_manage_reports: bool
    can_manage_settings: bool
    can_manage_backup: bool
    can_export_data: bool
    can_import_data: bool
    can_manage_roles: bool
    can_view_audit_log: bool

    class Config:
        from_attributes = True


# =============================================
# ✅ مفاتيح التفعيل (Licenses)
# =============================================

class LicenseGenerate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    arabic_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    subscription_plan: str = Field("basic", pattern="^(basic|pro|enterprise)$")
    max_users: int = Field(5, ge=1, le=1000)
    subscription_days: int = Field(365, ge=30, le=3650)
    can_manage_products: bool = True
    can_manage_sales: bool = True
    can_manage_purchases: bool = True
    can_manage_inventory: bool = True
    can_manage_customers: bool = True
    can_manage_suppliers: bool = True
    can_manage_employees: bool = True
    can_manage_reports: bool = True
    can_manage_settings: bool = False
    can_manage_backup: bool = False
    can_export_data: bool = False
    can_import_data: bool = False
    can_manage_roles: bool = False
    can_view_audit_log: bool = False


class LicenseResponse(BaseModel):
    success: bool
    license_key: str
    tenant: TenantResponse
    admin_password: str
    message: str


class LicenseValidate(BaseModel):
    valid: bool
    tenant: Optional[TenantResponse] = None
    message: str
    expiry_date: Optional[str] = None
    days_left: Optional[int] = None


# =============================================
# ✅ الإحصائيات
# =============================================

class SystemStats(BaseModel):
    total_tenants: int
    active_tenants: int
    inactive_tenants: int
    expired_tenants: int
    total_users: int
    total_storage_mb: int
    total_sales: float
    total_profit: float
    total_invoices: int
    plan_distribution: dict


# =============================================
# ✅ سجل النشاطات
# =============================================

class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    module: str
    description: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


# =============================================
# ✅ المصادقة
# =============================================

class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    is_system_admin: bool
    created_at: datetime
    last_login: Optional[datetime]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse