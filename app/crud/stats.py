# -*- coding: utf-8 -*-

"""
Talvo Admin API - Statistics
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.models import Tenant, User


def get_system_stats(db: Session):
    """الحصول على إحصائيات النظام"""
    
    tenants = db.query(Tenant).filter(Tenant.is_deleted == False).all()
    
    total_tenants = len(tenants)
    active_tenants = sum(1 for t in tenants if t.is_active)
    inactive_tenants = total_tenants - active_tenants
    expired_tenants = sum(1 for t in tenants if t.subscription_expiry and t.subscription_expiry < datetime.utcnow())
    
    total_users = db.query(User).filter(User.is_deleted == False).count()
    total_storage_mb = sum(t.total_storage_used_mb or 0 for t in tenants)
    
    # ✅ توزيع الخطط
    plan_distribution = {
        "basic": sum(1 for t in tenants if t.subscription_plan == "basic"),
        "pro": sum(1 for t in tenants if t.subscription_plan == "pro"),
        "enterprise": sum(1 for t in tenants if t.subscription_plan == "enterprise"),
    }
    
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "inactive_tenants": inactive_tenants,
        "expired_tenants": expired_tenants,
        "total_users": total_users,
        "total_storage_mb": total_storage_mb,
        "total_sales": 0,
        "total_profit": 0,
        "total_invoices": 0,
        "plan_distribution": plan_distribution,
    }