# -*- coding: utf-8 -*-

"""
Talvo Admin API - Database Connection
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os

# ✅ قاعدة البيانات من .env
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_NqGRB35KeDYl@ep-raspy-bar-ay65akbe-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)

# ✅ محرك قاعدة البيانات
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)

# ✅ جلسة قاعدة البيانات
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ Base للنماذج
Base = declarative_base()


def get_db() -> Session:
    """الحصول على جلسة قاعدة البيانات"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()