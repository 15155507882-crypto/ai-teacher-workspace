import { ILogger } from './logger.interface';
import { ConsoleLogger } from './console-logger';

const loggers = new Map<string, ILogger>();

export function createLogger(service: string, bindings?: Record<string, unknown>): ILogger {
  const existing = loggers.get(service);
  if (existing) return existing;

  const logger = new ConsoleLogger(service, bindings);
  loggers.set(service, logger);
  return logger;
}

export function getLogger(service: string): ILogger | undefined {
  return loggers.get(service);
}
