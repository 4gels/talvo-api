# -*- coding: utf-8 -*-

"""
Talvo Admin API - License Management
"""

import uuid
import hashlib
from datetime import datetime, timedelta


class LicenseManager:
    
    @staticmethod
    def generate_license_key(company_name: str, days_valid: int = 365) -> dict:
        unique_id = uuid.uuid4().hex.upper()
        expiry_date = (datetime.utcnow() + timedelta(days=days_valid)).isoformat()
        raw_key = f"{company_name}|{unique_id}|{expiry_date}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()[:16].upper()
        license_key = f"{unique_id[:8]}{key_hash}{unique_id[8:16]}"
        
        return {
            'license_key': license_key,
            'expiry_date': expiry_date,
            'company_name': company_name,
            'is_valid': True
        }
    
    @staticmethod
    def create_db_name(license_key: str) -> str:
        return f"tenant_{license_key[:8].lower()}"