export declare class LicenseManager {
    static generateLicenseKey(companyName: string, daysValid?: number): {
        license_key: string;
        expiry_date: string;
        company_name: string;
        is_valid: boolean;
    };
    static createDbName(licenseKey: string): string;
}
//# sourceMappingURL=license.d.ts.map