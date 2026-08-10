# -*- coding: utf-8 -*-

"""
Talvo Admin API - FastAPI Backend
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from app.database import get_db, engine
from app.models import Base, Tenant, User, ActivityLog
from app.schemas import (
    TenantCreate, TenantUpdate, TenantResponse,
    LicenseGenerate, LicenseResponse, LicenseValidate,
    SystemStats, ActivityLogResponse,
    LoginRequest, LoginResponse, UserResponse
)
from app.crud import tenants as tenants_crud
from app.crud import licenses as licenses_crud
from app.crud import stats as stats_crud
from app.core.security import verify_token, create_access_token, verify_password, get_password_hash

# ✅ إنشاء الجداول (إذا لم تكن موجودة)
Base.metadata.create_all(bind=engine)

# ✅ تطبيق FastAPI
app = FastAPI(
    title="Talvo Admin API",
    description="API لإدارة نظام Talvo - المستأجرين والمفاتيح",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# =============================================
# ✅ دوال المصادقة
# =============================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """التحقق من المستخدم الحالي"""
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.query(User).filter(
        User.username == payload.get("sub"),
        User.is_system_admin == True,
        User.tenant_id.is_(None)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or not authorized"
        )
    
    return user


# =============================================
# ✅ 1. إدارة المستأجرين (Tenants)
# =============================================

@app.get("/api/v1/tenants", response_model=List[TenantResponse])
def get_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """الحصول على جميع المستأجرين"""
    return tenants_crud.get_tenants(db, skip=skip, limit=limit)


@app.post("/api/v1/tenants", response_model=TenantResponse)
def create_tenant(
    tenant: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """إنشاء مستأجر جديد"""
    return tenants_crud.create_tenant(db, tenant, current_user.id)


@app.get("/api/v1/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """الحصول على مستأجر بواسطة المعرف"""
    return tenants_crud.get_tenant(db, tenant_id)


@app.put("/api/v1/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: int,
    tenant: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """تحديث مستأجر"""
    return tenants_crud.update_tenant(db, tenant_id, tenant, current_user.id)


@app.delete("/api/v1/tenants/{tenant_id}")
def delete_tenant(
    tenant_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """حذف مستأجر"""
    return tenants_crud.delete_tenant(db, tenant_id, force, current_user.id)


@app.post("/api/v1/tenants/{tenant_id}/toggle-status")
def toggle_tenant_status(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """تغيير حالة المستأجر"""
    return tenants_crud.toggle_status(db, tenant_id, current_user.id)


# =============================================
# ✅ 2. إدارة مفاتيح التفعيل (Licenses)
# =============================================

@app.post("/api/v1/licenses/generate", response_model=LicenseResponse)
def generate_license(
    data: LicenseGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """توليد مفتاح تفعيل جديد"""
    return licenses_crud.generate_license(db, data, current_user.id)


@app.get("/api/v1/licenses/{license_key}/validate", response_model=LicenseValidate)
def validate_license(
    license_key: str,
    db: Session = Depends(get_db)
):
    """التحقق من صحة مفتاح التفعيل"""
    return licenses_crud.validate_license(db, license_key)


@app.post("/api/v1/licenses/{tenant_id}/regenerate")
def regenerate_license(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """إعادة توليد مفتاح التفعيل لمستأجر"""
    return licenses_crud.regenerate_license(db, tenant_id, current_user.id)


# =============================================
# ✅ 3. إحصائيات النظام
# =============================================

@app.get("/api/v1/stats", response_model=SystemStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """الحصول على إحصائيات النظام"""
    return stats_crud.get_system_stats(db)


# =============================================
# ✅ 4. سجل النشاطات
# =============================================

@app.get("/api/v1/activities", response_model=List[ActivityLogResponse])
def get_activities(
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """الحصول على سجل النشاطات"""
    return db.query(ActivityLog).order_by(
        ActivityLog.created_at.desc()
    ).offset(skip).limit(limit).all()


# =============================================
# ✅ 5. المصادقة (Auth)
# =============================================

@app.post("/api/v1/auth/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    """تسجيل الدخول"""
    user = db.query(User).filter(
        User.username == data.username,
        User.is_system_admin == True,
        User.tenant_id.is_(None)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # ✅ تحديث آخر تسجيل دخول
    user.last_login = datetime.utcnow()
    db.commit()
    
    # ✅ تسجيل النشاط
    ActivityLog.log(
        db=db,
        user_id=user.id,
        action="login",
        module="auth",
        description="تسجيل دخول من API",
        ip_address="",
        user_agent="",
        tenant_id=None
    )
    
    token = create_access_token({"sub": user.username})
    
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            is_system_admin=user.is_system_admin,
            created_at=user.created_at,
            last_login=user.last_login
        )
    )


@app.get("/api/v1/auth/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """الحصول على معلومات المستخدم الحالي"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        is_system_admin=current_user.is_system_admin,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


# =============================================
# ✅ 6. الصحة (Health Check)
# =============================================

@app.get("/health")
def health_check():
    """التحقق من صحة الخادم"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


@app.get("/")
def root():
    """الصفحة الرئيسية"""
    return {
        "name": "Talvo Admin API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


# =============================================
# ✅ 7. تشغيل التطبيق
# =============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=7860, reload=True)