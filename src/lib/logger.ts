type LogLevel = "dev" | "error" | "warn";

export interface LoggerOptions {
  prefix?: string;
}

class Logger {
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ? `[${options.prefix}]` : "";
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors and warnings
    if (level === "error" || level === "warn") return true;
    // Only log dev messages in non-production
    return process.env.NODE_ENV !== "production";
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `${this.prefix} [${level.toUpperCase()}] ${message}`;
  }

  dev(message: string, ...args: unknown[]): void {
    if (this.shouldLog("dev")) {
      console.warn(this.formatMessage("dev", message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage("error", message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage("warn", message), ...args);
  }
}

// Create a default logger instance
export const logger = new Logger();

// Export the factory function to create loggers with custom prefixes
export const createLogger = (options: LoggerOptions) => new Logger(options);
