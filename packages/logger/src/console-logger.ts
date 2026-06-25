import { LogLevel, LogEntry, ILogger } from './logger.interface';

export class ConsoleLogger implements ILogger {
  private service: string;
  private traceId?: string;
  private bindings: Record<string, unknown>;

  constructor(service: string, bindings: Record<string, unknown> = {}) {
    this.service = service;
    this.bindings = bindings;
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new ConsoleLogger(this.service, { ...this.bindings, ...bindings });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, { ...context, error: error?.message }, error?.stack);
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, { ...context, error: error?.message }, error?.stack);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    stack?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      traceId: this.traceId,
      message,
      context: { ...this.bindings, ...context },
      stack,
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }
}
