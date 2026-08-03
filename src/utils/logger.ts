import * as vscode from 'vscode';

/**
 * Logger utility for the extension.
 */
class Logger {
    private outputChannel: vscode.OutputChannel | null = null;
    private logLevel: LogLevel = LogLevel.INFO;

    /**
     * Set the output channel.
     */
    setOutputChannel(channel: vscode.OutputChannel): void {
        this.outputChannel = channel;
    }

    /**
     * Set the log level.
     */
    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * Log debug message.
     */
    debug(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            this.log('DEBUG', message, data);
        }
    }

    /**
     * Log info message.
     */
    info(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.log('INFO', message, data);
        }
    }

    /**
     * Log warning message.
     */
    warn(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.WARN) {
            this.log('WARN', message, data);
        }
    }

    /**
     * Log error message.
     */
    error(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.ERROR) {
            this.log('ERROR', message, data);
        }
    }

    /**
     * Log a message.
     */
    private log(level: string, message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Log to output channel
        if (this.outputChannel) {
            this.outputChannel.appendLine(logMessage);
            
            // Bug 22 Fixed: Check for undefined explicitly so we don't skip 0, false, or ""
            if (data !== undefined) {
                let dataString: string;
                try {
                    // Bug 21 Fixed: Wrap in try/catch to prevent circular reference crashes
                    const stringified = JSON.stringify(data, null, 2);
                    
                    // Bug 23 Fixed: stringified can be undefined. Fallback to String() to guarantee appendLine gets a string.
                    dataString = stringified !== undefined ? stringified : String(data);
                } catch (e) {
                    dataString = `[Unserializable data: ${String(data)}]`;
                }
                this.outputChannel.appendLine(dataString);
            }
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(logMessage);
            if (data !== undefined) {
                console.log(data);
            }
        }
    }

    /**
     * Show a notification with the message.
     */
    notify(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
        switch (type) {
            case 'error':
                vscode.window.showErrorMessage(message);
                break;
            case 'warning':
                vscode.window.showWarningMessage(message);
                break;
            default:
                vscode.window.showInformationMessage(message);
                break;
        }
    }
}

/**
 * Log levels.
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * Singleton logger instance.
 */
export const logger = new Logger();