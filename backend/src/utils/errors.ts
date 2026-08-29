// ─────────────────────────────────────────────────────────────────────────────
// errors.ts
// Turning thrown values into something a log line can actually be debugged from.
//
// Sequelize buries everything useful one level down on `.parent` (the raw pg
// error): a unique violation arrives with the message "Validation error", and
// the SQLSTATE, constraint name and offending key live on the cause.  Logging
// `error.message` therefore prints a sentence that is identical whether the
// batch hit a duplicate primary key, a dropped socket or a missing database.
// ─────────────────────────────────────────────────────────────────────────────

/** Flattened view of an error, including whatever the driver attached to it. */
export interface ErrorDetails {
    name:         string;
    message:      string;
    /** SQLSTATE ('23505') or socket errno ('ECONNREFUSED'). */
    code?:        string;
    /** Human label for `code`, e.g. 'unique violation'. */
    codeLabel?:   string;
    detail?:      string;
    hint?:        string;
    constraint?:  string;
    table?:       string;
    column?:      string;
    schema?:      string;
    /** The statement that failed, truncated. */
    sql?:         string;
    /** Operation name attached by `withDbContext`. */
    operation?:   string;
    /** Call-site context attached by `withDbContext`. */
    context?:     Record<string, unknown>;
    /** True when a retry stands a chance (connection loss, deadlock, ...). */
    transient?:   boolean;
    stack?:       string;
    cause?:       ErrorDetails;
}

/**
 * SQLSTATE and socket errno -> label.
 *
 * Only codes this app can realistically produce are listed; anything else is
 * still reported, just without the friendly name.
 */
const CODE_LABELS: Record<string, string> = {
    // Constraint violations — a bad row in the batch.
    '23505': 'unique violation (duplicate key)',
    '23503': 'foreign key violation',
    '23502': 'not-null violation',
    '23514': 'check constraint violation',

    // Bad values — usually a malformed server response that got this far.
    '22001': 'value too long for column',
    '22003': 'numeric value out of range',
    '22007': 'invalid datetime format',
    '22P02': 'invalid text representation (bad cast)',

    // Schema drift — a migration did not run.
    '42P01': 'undefined table',
    '42703': 'undefined column',
    '42883': 'undefined function',
    '42804': 'datatype mismatch',
    '42601': 'syntax error',

    // Connection / auth.
    '3D000': 'database does not exist',
    '28P01': 'password authentication failed',
    '28000': 'invalid authorization',
    '08006': 'connection failure',
    '08003': 'connection does not exist',
    '08001': 'unable to establish connection',
    '53300': 'too many connections',
    '53200': 'out of memory',
    '57P01': 'server shut down the connection',
    '57P03': 'database not accepting connections',

    // Concurrency.
    '40001': 'serialization failure',
    '40P01': 'deadlock detected',
    '55P03': 'lock not available',
    '25P02': 'transaction aborted by an earlier error',

    // TimescaleDB raises this for writes against a compressed chunk.
    '0A000': 'feature not supported (compressed chunk?)',

    // Socket-level failures, which never carry a SQLSTATE.
    ECONNREFUSED: 'connection refused',
    ECONNRESET:   'connection reset by peer',
    ETIMEDOUT:    'connection timed out',
    EHOSTUNREACH: 'host unreachable',
    ENOTFOUND:    'host not found (DNS)',
    EPIPE:        'broken pipe',
};

/** Codes where the same batch could plausibly succeed on a later attempt. */
const TRANSIENT_CODES = new Set([
    '08006', '08003', '08001', '53300', '53200', '57P01', '57P03',
    '40001', '40P01', '55P03',
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', 'EPIPE',
]);

const MAX_SQL_LENGTH = 500;

/** Collapses whitespace and truncates, so a 40-line query stays one log line. */
function condenseSql(sql: unknown): string | undefined {
    if (typeof sql !== 'string' || sql.length === 0) return undefined;
    const flat = sql.replace(/\s+/g, ' ').trim();
    return flat.length > MAX_SQL_LENGTH ? `${flat.slice(0, MAX_SQL_LENGTH)}...` : flat;
}

function asString(val: unknown): string | undefined {
    return typeof val === 'string' && val.length > 0 ? val : undefined;
}

/**
 * Error carrying the operation and the call-site context it failed under, so
 * the log line says *which* write of *how many rows* broke rather than just
 * that a write broke.  The driver error stays reachable as `cause`.
 */
export class DatabaseOperationError extends Error {
    readonly operation: string;
    readonly context:   Record<string, unknown>;

    constructor(operation: string, context: Record<string, unknown>, cause: unknown) {
        const described = describeError(cause);
        super(`${operation} failed: ${formatErrorDetails(described)}`, { cause });
        this.name      = 'DatabaseOperationError';
        this.operation = operation;
        this.context   = context;
    }
}

/**
 * Runs a database call, re-throwing failures as a `DatabaseOperationError`
 * tagged with what was being written.  The original error is preserved as the
 * cause, so nothing is lost by wrapping.
 */
export async function withDbContext<T>(
    operation: string,
    context: Record<string, unknown>,
    fn: () => Promise<T>
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        // Already tagged by an inner call — the innermost context is the useful
        // one, so let it through rather than nesting wrappers.
        if (error instanceof DatabaseOperationError) throw error;
        throw new DatabaseOperationError(operation, context, error);
    }
}

/**
 * Pulls the diagnostic fields off an error-shaped value.
 *
 * Kept separate from `describeError` because winston merges an error's own
 * properties onto its `info` object and hands the logger a plain record rather
 * than the Error itself -- that record has to be readable by the same code.
 */
function extractDiagnostics(source: any, depth: number): ErrorDetails {
    // A DatabaseOperationError's message already embeds the full description of
    // its cause, so re-deriving the driver fields here would print the SQL and
    // the constraint twice.  The cause is still carried, for transience checks.
    if (source instanceof DatabaseOperationError) {
        const cause = describeError(source.cause, depth + 1);
        return {
            name:      source.name,
            message:   source.message,
            operation: source.operation,
            context:   source.context,
            transient: cause.transient,
            cause,
        };
    }

    // Sequelize wraps the pg error as `.parent` / `.original`; native errors use
    // `.cause`.  They are all the same idea, so treat them uniformly.
    const cause = source.parent ?? source.original ?? source.cause;

    // Driver fields sit on the pg error, but Sequelize copies some onto the
    // wrapper, so read through to whichever actually has them.
    const pick = (key: string): unknown => source[key] ?? cause?.[key];

    const details: ErrorDetails = {
        name:    asString(source.name) ?? 'Error',
        message: asString(source.message) ?? safeStringify(source),
    };

    const code = asString(pick('code'));
    if (code) {
        details.code      = code;
        details.codeLabel = CODE_LABELS[code];
        details.transient = TRANSIENT_CODES.has(code);
    }

    // `detail` is where postgres puts the actual offending key, e.g.
    // "Key (server_id, timestamp)=(42, 2026-08-29 12:00:00+00) already exists."
    const detail     = asString(pick('detail'));
    const hint       = asString(pick('hint'));
    const constraint = asString(pick('constraint'));
    const table      = asString(pick('table'));
    const column     = asString(pick('column'));
    const schema     = asString(pick('schema'));
    const sql        = condenseSql(source.sql ?? cause?.sql);

    if (detail)     details.detail     = detail;
    if (hint)       details.hint       = hint;
    if (constraint) details.constraint = constraint;
    if (table)      details.table      = table;
    if (column)     details.column     = column;
    if (schema)     details.schema     = schema;
    if (sql)        details.sql        = sql;

    if (source instanceof DatabaseOperationError) {
        details.operation = source.operation;
        details.context   = source.context;
    }

    // Bounded so a self-referential cause chain cannot loop.
    if (cause != null && typeof cause === 'object' && depth < 3) {
        details.cause = extractDiagnostics(cause, depth + 1);
        // A wrapper rarely carries the code itself; inherit the verdict so
        // callers can check the top-level error alone.
        details.transient ??= details.cause.transient;
    }

    return details;
}

/**
 * Flattens any thrown value (and its cause chain) into `ErrorDetails`.
 *
 * Accepts error-shaped plain objects as well as `Error` instances, so a
 * winston `info` record carrying a merged error describes just as well.
 */
export function describeError(error: unknown, depth: number = 0): ErrorDetails {
    if (error === null || typeof error !== 'object') {
        return { name: typeof error, message: safeStringify(error) };
    }

    const details = extractDiagnostics(error, depth);
    if (error instanceof Error && error.stack) details.stack = error.stack;

    return details;
}

/** True when retrying the same work could plausibly succeed. */
export function isTransientError(error: unknown): boolean {
    let current: ErrorDetails | undefined = describeError(error);
    while (current) {
        if (current.transient) return true;
        current = current.cause;
    }
    return false;
}

/**
 * The bracketed diagnostic block -- the fields that actually distinguish one
 * failure from another.  Empty string when the error carried none of them.
 * Fields absent from the error are omitted rather than printed as undefined.
 */
export function formatDiagnosticFields(details: ErrorDetails): string {
    const fields: string[] = [];

    const add = (key: string, val: unknown) => {
        if (val === undefined || val === null || val === '') return;
        fields.push(`${key}=${typeof val === 'string' ? val : safeStringify(val)}`);
    };

    add('code',       details.codeLabel ? `${details.code} (${details.codeLabel})` : details.code);
    add('table',      details.table);
    add('constraint', details.constraint);
    add('column',     details.column);
    add('detail',     details.detail);
    add('hint',       details.hint);

    if (details.context && Object.keys(details.context).length > 0) {
        add('context', details.context);
    }
    add('sql', details.sql);

    return fields.length > 0 ? `[${fields.join(' | ')}]` : '';
}

/**
 * One-line rendering of `ErrorDetails`: the message, then the diagnostic fields
 * that were actually present.
 */
export function formatErrorDetails(details: ErrorDetails): string {
    // The name adds nothing when it is the generic `Error`.
    const label = details.name && details.name !== 'Error'
        ? `${details.name}: `
        : '';

    const fields = formatDiagnosticFields(details);
    const body   = fields ? ` ${fields}` : '';

    // Sequelize's own message ("Validation error") is frequently useless, so the
    // cause's message is appended when it says something different.
    const causeMessage = details.cause && !details.message.includes(details.cause.message)
        ? ` <- ${details.cause.name}: ${details.cause.message}`
        : '';

    return `${label}${details.message}${body}${causeMessage}`;
}

/** `formatErrorDetails` applied straight to a thrown value. */
export function formatError(error: unknown): string {
    return formatErrorDetails(describeError(error));
}

/** JSON that cannot itself throw on cycles, BigInt or exotic values. */
export function safeStringify(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error)    return formatError(value);

    const seen = new WeakSet<object>();
    try {
        return JSON.stringify(value, (_key, val) => {
            if (typeof val === 'bigint') return `${val}n`;
            if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) return '[Circular]';
                seen.add(val);
            }
            return val;
        }) ?? String(value);
    } catch {
        return String(value);
    }
}
