import { Request, Response } from 'express';
export declare class LicensesController {
    generate(req: Request, res: Response): Promise<void>;
    validate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    regenerate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=licenses.d.ts.map