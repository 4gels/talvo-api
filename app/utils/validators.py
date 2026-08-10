# -*- coding: utf-8 -*-

"""
Talvo Admin API - Validators
"""

import re
from typing import Optional


def validate_license_key(license_key: str) -> bool:
    """التحقق من صحة مفتاح التفعيل (32 حرفاً)"""
    return bool(re.match(r'^[A-Z0-9]{32}$', license_key))


def validate_email(email: str) -> bool:
    """التحقق من صحة البريد الإلكتروني"""
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))


def validate_phone(phone: str) -> bool:
    """التحقق من صحة رقم الهاتف"""
    return bool(re.match(r'^[0-9+\-() ]{7,20}$', phone))