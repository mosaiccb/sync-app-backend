import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
export interface ParBrinkEmployee {
    EmployeeId: string;
    FirstName: string;
    LastName: string;
    Status: string;
    Position: string;
    HourlyRate: number;
}
export interface ParBrinkShift {
    ShiftId: string;
    EmployeeId: string;
    StartTime: string;
    EndTime?: string;
    JobId?: string;
    JobName?: string;
    Hours?: number;
    Status: 'clocked-in' | 'clocked-out' | 'break';
}
export interface ParBrinkSales {
    SaleId: string;
    Amount: number;
    Timestamp: string;
    ItemCount: number;
    PaymentMethod?: string;
    EmployeeId?: string;
}
export declare function laborShifts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
export declare function employees(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
export declare function sales(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
export declare function tips(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
export declare function tills(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=parBrinkEnhanced.d.ts.map