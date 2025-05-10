import {notify, notifyError, notifyWarning} from '#/notification';

enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
}

const colors = {
    default: '\x1b[39m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

type Color = keyof typeof colors;

const levelColor: Record<LogLevel, Color> = {
    [LogLevel.DEBUG]: 'green',
    [LogLevel.INFO]: 'blue',
    [LogLevel.WARN]: 'yellow',
    [LogLevel.ERROR]: 'red',
};

export class Logger {
    LogLevel = LogLevel;
    level: LogLevel = LogLevel.DEBUG;

    debug(format: string, ...args: unknown[]): void {
        this.log(LogLevel.DEBUG, format, ...args);
    }

    info(format: string, ...args: unknown[]): void {
        this.log(LogLevel.INFO, format, ...args);
    }

    warn(format: string, ...args: unknown[]): void {
        this.log(LogLevel.WARN, format, ...args);
    }

    error(err: Error): void;
    error(format: string, ...args: unknown[]): void;
    error(errOrFormat: string | Error, ...args: unknown[]): void {
        if (errOrFormat instanceof Error) {
            this.error('%s', errOrFormat.message);
        } else {
            this.log(LogLevel.ERROR, errOrFormat, ...args);
        }
    }

    TODO(format: string, ...args: unknown[]): void {
        this.log(LogLevel.ERROR, 'TODO: %s', format, ...args);
    }

    private log(level: LogLevel, format: string, ...args: unknown[]): void {
        if (level < this.level) {
            return;
        }
        const levelStr = `${colors[levelColor[level]]}[${LogLevel[level]}]${colors.default}`;
        const prefix = `${timeStr()} ${levelStr}:`;
        const formattedMessage = sprintf(format, ...args);
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(prefix, formattedMessage);
                break;
            case LogLevel.INFO:
                console.info(prefix, formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(prefix, formattedMessage);
                break;
            case LogLevel.ERROR:
                console.error(prefix, formattedMessage);
                break;
        }
        if (__DEV_MODE) {
            switch (level) {
                case LogLevel.DEBUG:
                    break;
                case LogLevel.INFO:
                    notify(formattedMessage);
                    break;
                case LogLevel.WARN:
                    notifyWarning(formattedMessage);
                    break;
                case LogLevel.ERROR:
                    notifyError(formattedMessage);
                    break;
            }
        }
    }
}

function timeStr(date = new Date()): string {
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export const logger = new Logger();

export function sprintf(format: string, ...args: any[]): string {
    let index = 0;

    const seen = new WeakSet();

    const formatArg = (specifier: string, arg: unknown): string => {
        switch (specifier) {
            case '%s': {
                if (typeof arg === 'bigint') return `${arg.toString()}n`;
                if (typeof arg === 'object' && arg !== null) {
                    return safeInspect(arg, {depth: 0, compact: 3});
                }
                return String(arg);
            }
            case '%d': {
                if (typeof arg === 'bigint' || typeof arg === 'symbol') return String(NaN);
                return Number(arg).toString();
            }
            case '%i': {
                if (typeof arg === 'bigint' || typeof arg === 'symbol') return String(NaN);
                return parseInt(arg as string, 10).toString();
            }
            case '%f': {
                if (typeof arg === 'symbol') return String(NaN);
                return parseFloat(arg as string).toString();
            }
            case '%j': {
                try {
                    return JSON.stringify(arg, (_, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) return '[Circular]';
                            seen.add(value);
                        }
                        return value;
                    });
                } catch {
                    return '[Circular]';
                }
            }
            case '%o': {
                return safeInspect(arg, {showHidden: true, showProxy: true});
            }
            case '%O': {
                return safeInspect(arg);
            }
            case '%c': {
                index++; // Skip the CSS argument
                return '';
            }
            case '%%': {
                return '%';
            }
            default:
                return specifier;
        }
    };

    const result = format.replace(/%%|%[sdifjoOc]/g, (match) => {
        if (match === '%%') return '%';
        if (match === '%c') {
            index++;
            return ''; // CSS ignored
        }
        const arg = args[index++];
        return formatArg(match, arg);
    });

    // Append remaining args (like console.log does)
    const remaining = args
        .slice(index)
        .map((arg) => (typeof arg === 'object' ? safeInspect(arg) : String(arg)));

    return remaining.length > 0 ? `${result} ${remaining.join(' ')}` : result;
}

interface InspectOptions {
    depth?: number;
    colors?: boolean;
    showHidden?: boolean;
    showProxy?: boolean;
    compact?: boolean | number;
}

function safeInspect(value: any, options: InspectOptions = {}): string {
    if (value === null || value === undefined) {
        return String(value);
    }
    if (typeof window === 'undefined') {
        const util = require('util');
        return util.inspect(value, options);
    }
    try {
        if (value instanceof Error) {
            let msg = value.message;
            if (value.cause) {
                msg += `\n\t[cause]: ${safeInspect(value.cause, options)}`;
            }
            return msg;
        }
        return JSON.stringify(value, null, 2);
    } catch {
        return Object.prototype.toString.call(value);
    }
}
