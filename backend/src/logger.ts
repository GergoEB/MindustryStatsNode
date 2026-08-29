import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import util from 'node:util';
import {env} from './config/env.js';
import {
    describeError,
    formatDiagnosticFields,
    formatErrorDetails,
    safeStringify,
} from './utils/errors.js';

// Winston stashes the trailing arguments of `logger.error(msg, a, b)` here.
const SPLAT = Symbol.for('splat');

// util.format-style placeholders; their presence decides whether the trailing
// arguments are interpolated into the message or appended after it.
const FORMAT_TOKEN = /%[sdifjoOc%]/;

/**
 * Renders one trailing argument.
 *
 * Errors go through `describeError` so a Sequelize failure prints its SQLSTATE,
 * constraint and offending key instead of "Validation error".
 */
const renderArg = (value: unknown): string =>
    value instanceof Error
        ? formatErrorDetails(describeError(value))
        : safeStringify(value);

/**
 * Builds the text that follows the message.
 *
 * `winston.format.splat()` is deliberately not used.  For a message with no
 * placeholders it merges the trailing arguments onto `info` with Object.assign,
 * which spreads a plain string into one numbered key per character; and because
 * the previous format chain listed `splat()` and `errors()` *after* `printf()`,
 * neither ran before the line was rendered.  That is why
 * `logger.error('Database batch write failed:', error.message)` printed the
 * prefix and nothing else, whatever the underlying failure was.
 */
function renderMessage(info: winston.Logform.TransformableInfo): string {
    try {
        let message = typeof info.message === 'string'
            ? info.message
            : safeStringify(info.message);

        const splat = (info as any)[SPLAT];
        const args = Array.isArray(splat) ? splat : [];

        if (args.length === 0) {
            // `logger.error(err)`: winston copies the error's own properties onto
            // `info`, so the diagnostics have to be read back off the record.
            const fields = formatDiagnosticFields(describeError(info));
            return fields ? `${message} ${fields}` : message;
        }

        if (FORMAT_TOKEN.test(message)) {
            return util.format(
                message,
                ...args.map(a => a instanceof Error ? formatErrorDetails(describeError(a)) : a)
            );
        }

        // For a lone object argument winston has already appended its `.message`
        // onto the log message, before any format runs.  Strip that copy so the
        // full rendering below -- which repeats it with the diagnostics attached --
        // does not print the same sentence twice.
        const only = args.length === 1 ? args[0] : undefined;
        if (typeof only === 'object' && only !== null && typeof (only as any).message === 'string') {
            const appended = ` ${(only as any).message}`;
            if (message.endsWith(appended)) message = message.slice(0, -appended.length);
        }

        return `${message} ${args.map(renderArg).join(' ')}`;
    }  catch (err) {
        return `${String(info.message)} [log formatting failed: ${String(err)}]`;
    }
}

/**
 * Formats are applied in the order given, so `errors()` has to come before
 * `printf()` -- previously it sat after and was therefore dead weight.
 */
export const createLogger = (moduleName?: string) => winston.createLogger({
    level: env.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.colorize(),
        winston.format.printf(info => {
            const prefix = moduleName ? `[${moduleName}] ` : '';
            const line   = `${info.timestamp} ${info.level}: ${prefix}${renderMessage(info)}`;

            // Only errors carry a stack, and it belongs below the summary line.
            const stack = (info as any).stack;
            return typeof stack === 'string' && stack.length > 0
                ? `${line}\n${stack}`
                : line;
        })
    ),
    transports: [
        // Console transport
        new winston.transports.Console(),

        // Rotating error log file
        new winston.transports.DailyRotateFile({
            filename: path.join(env.LOG_DIR, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d', // Keep logs for 14 days
            maxSize: '20m',  // Rotate when file reaches 20MB
            format: winston.format.combine(
                winston.format.uncolorize()
            )
        }),

        // Rotating combined log file
        new winston.transports.DailyRotateFile({
            filename: path.join(env.LOG_DIR, '%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d', // Keep logs for 14 days
            maxSize: '20m',  // Rotate when file reaches 20MB
            format: winston.format.combine(
                winston.format.uncolorize()
            )
        })
    ]
});
