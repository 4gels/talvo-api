# -*- coding: utf-8 -*-

"""
Talvo Admin API - Configuration
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """إعدادات التطبيق"""
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_NqGRB35KeDYl@ep-raspy-bar-ay65akbe-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    )
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "talvo-admin-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    APP_NAME: str = "Talvo Admin API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"


settings = Settings()