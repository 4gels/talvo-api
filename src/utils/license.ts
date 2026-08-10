import { randomUUID, createHash } from 'crypto';

export class LicenseManager {
  static generateLicenseKey(companyName: string, daysValid: number = 365) {
    const uniqueId = randomUUID().replace(/-/g, '').toUpperCase();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);
    
    const rawKey = `${companyName}|${uniqueId}|${expiryDate.toISOString()}`;
    const keyHash = createHash('sha256')
      .update(rawKey)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();
    
    const licenseKey = `${uniqueId.substring(0,8)}${keyHash}${uniqueId.substring(8,16)}`;
    
    return {
      license_key: licenseKey,
      expiry_date: expiryDate.toISOString(),
      company_name: companyName,
      is_valid: true
    };
  }

  static createDbName(licenseKey: string): string {
    return `tenant_${licenseKey.substring(0, 8).toLowerCase()}`;
  }
}