"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
const uuid_1 = require("uuid");
class Logger {
    serviceName;
    constructor(serviceName = 'ukg-sync-backend') {
        this.serviceName = serviceName;
    }
    log(level, message, context) {
        const timestamp = new Date().toISOString();
        const correlationId = context?.correlationId || (0, uuid_1.v4)();
        const logEntry = {
            timestamp,
            level,
            service: this.serviceName,
            message,
            correlationId,
            ...context
        };
        // In production, this would integrate with Application Insights
        // For now, we'll use console logging with structured format
        console.log(JSON.stringify(logEntry));
    }
    info(message, context) {
        this.log('INFO', message, context);
    }
    error(message, context) {
        this.log('ERROR', message, context);
    }
    warn(message, context) {
        this.log('WARN', message, context);
    }
    debug(message, context) {
        this.log('DEBUG', message, context);
    }
    trace(message, context) {
        this.log('TRACE', message, context);
    }
}
exports.Logger = Logger;
// Export singleton instance
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map