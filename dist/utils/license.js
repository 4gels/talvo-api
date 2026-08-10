"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseManager = void 0;
const crypto_1 = require("crypto");
class LicenseManager {
    static generateLicenseKey(companyName, daysValid = 365) {
        const uniqueId = (0, crypto_1.randomUUID)().replace(/-/g, '').toUpperCase();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysValid);
        const rawKey = `${companyName}|${uniqueId}|${expiryDate.toISOString()}`;
        const keyHash = (0, crypto_1.createHash)('sha256')
            .update(rawKey)
            .digest('hex')
            .substring(0, 16)
            .toUpperCase();
        const licenseKey = `${uniqueId.substring(0, 8)}${keyHash}${uniqueId.substring(8, 16)}`;
        return {
            license_key: licenseKey,
            expiry_date: expiryDate.toISOString(),
            company_name: companyName,
            is_valid: true
        };
    }
    static createDbName(licenseKey) {
        return `tenant_${licenseKey.substring(0, 8).toLowerCase()}`;
    }
}
exports.LicenseManager = LicenseManager;
//# sourceMappingURL=license.js.map