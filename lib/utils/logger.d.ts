export interface LogContext {
    correlationId?: string;
    tenantId?: string;
    userId?: string;
    operation?: string;
    [key: string]: any;
}
export declare class Logger {
    private serviceName;
    constructor(serviceName?: string);
    private log;
    info(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    trace(message: string, context?: LogContext): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map