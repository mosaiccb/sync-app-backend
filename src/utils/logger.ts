import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  operation?: string;
  [key: string]: any;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'ukg-sync-backend') {
    this.serviceName = serviceName;
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const correlationId = context?.correlationId || uuidv4();
    
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

  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, context);
  }

  trace(message: string, context?: LogContext): void {
    this.log('TRACE', message, context);
  }
}

// Export singleton instance
export const logger = new Logger();
