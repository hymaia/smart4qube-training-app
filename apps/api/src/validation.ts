import { ISSUE_TYPES, ISSUE_SEVERITIES, ISSUE_STATUSES } from './types.js';
import type { Issue, IssueType, IssueSeverity, IssueStatus } from './types.js';

/** The client-editable part of an issue (everything except server-assigned fields). */
export type IssueFields = Omit<Issue, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;

export type ValidationResult = { ok: true; value: IssueFields } | { ok: false; details: string[] };

const SERVER_ASSIGNED = ['id', 'projectId', 'createdAt', 'updatedAt'] as const;
// The contract lists author, id, projectId and createdAt as immutable on update.
// updatedAt is server-refreshed on every update, so supplying it is rejected too.
const IMMUTABLE_ON_UPDATE = ['author', 'id', 'projectId', 'createdAt', 'updatedAt'] as const;
const UPDATABLE = ['filePath', 'line', 'type', 'severity', 'status', 'rule', 'message'] as const;
const RULE_PATTERN = /^S\d+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

/** Per-field shape checks; only fields present in `body` are checked. */
function checkFieldShapes(body: Record<string, unknown>, details: string[]): void {
  if (has(body, 'filePath')) {
    const v = body.filePath;
    if (typeof v !== 'string' || v.length === 0) details.push('filePath: must be a non-empty string');
    else if (v.startsWith('/') || v.includes('\\')) details.push('filePath: must be a repo-relative POSIX path');
  }
  if (has(body, 'line')) {
    const v = body.line;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) details.push('line: must be an integer >= 1');
  }
  if (has(body, 'type') && !ISSUE_TYPES.includes(body.type as IssueType)) {
    details.push(`type: must be one of ${ISSUE_TYPES.join(', ')}`);
  }
  if (has(body, 'severity') && body.severity !== null && !ISSUE_SEVERITIES.includes(body.severity as IssueSeverity)) {
    details.push(`severity: must be null or one of ${ISSUE_SEVERITIES.join(', ')}`);
  }
  if (has(body, 'status') && !ISSUE_STATUSES.includes(body.status as IssueStatus)) {
    details.push(`status: must be one of ${ISSUE_STATUSES.join(', ')}`);
  }
  if (has(body, 'rule') && body.rule !== null && (typeof body.rule !== 'string' || !RULE_PATTERN.test(body.rule))) {
    details.push('rule: must be null or a rule key shaped S<digits> (e.g. S3649)');
  }
  if (has(body, 'message') && (typeof body.message !== 'string' || body.message.trim().length === 0)) {
    details.push('message: must be a non-empty string');
  }
  if (has(body, 'author') && body.author !== null && (typeof body.author !== 'string' || body.author.trim().length === 0)) {
    details.push('author: must be null or a non-empty string');
  }
}

/**
 * Cross-field invariant from the Issue schema: COMMENT issues have
 * severity = null, rule = null and author != null; every other type has
 * severity != null, rule != null and author = null.
 */
function checkTypeInvariant(fields: IssueFields, details: string[]): void {
  if (fields.type === 'COMMENT') {
    if (fields.severity !== null) details.push('severity: must be null or omitted when type is COMMENT');
    if (fields.rule !== null) details.push('rule: must be null or omitted when type is COMMENT');
    if (fields.author === null) details.push('author: is required when type is COMMENT');
  } else {
    if (fields.severity === null) details.push(`severity: is required when type is ${fields.type}`);
    if (fields.rule === null) details.push(`rule: is required when type is ${fields.type}`);
    if (fields.author !== null) details.push(`author: must be null or omitted when type is ${fields.type}`);
  }
}

export function validateNewIssue(body: unknown): ValidationResult {
  if (!isPlainObject(body)) return { ok: false, details: ['body: must be a JSON object'] };

  const details: string[] = [];
  for (const key of SERVER_ASSIGNED) {
    if (has(body, key)) details.push(`${key}: is server-assigned and must not be supplied`);
  }
  for (const key of ['filePath', 'line', 'type', 'message']) {
    if (!has(body, key) || body[key] === undefined) details.push(`${key}: is required`);
  }
  checkFieldShapes(body, details);
  if (details.length > 0) return { ok: false, details };

  const fields: IssueFields = {
    filePath: body.filePath as string,
    line: body.line as number,
    type: body.type as IssueType,
    severity: (body.severity ?? null) as IssueSeverity | null,
    status: (body.status ?? 'OPEN') as IssueStatus,
    rule: (body.rule ?? null) as string | null,
    message: body.message as string,
    author: (body.author ?? null) as string | null,
  };
  checkTypeInvariant(fields, details);
  return details.length > 0 ? { ok: false, details } : { ok: true, value: fields };
}

export function validateIssueUpdate(body: unknown, current: Issue): ValidationResult {
  if (!isPlainObject(body)) return { ok: false, details: ['body: must be a JSON object'] };

  const details: string[] = [];
  for (const key of IMMUTABLE_ON_UPDATE) {
    if (has(body, key)) details.push(`${key}: is immutable and must not be supplied`);
  }
  const supplied = UPDATABLE.filter((key) => has(body, key) && body[key] !== undefined);
  if (supplied.length === 0 && details.length === 0) {
    details.push(`body: must contain at least one of ${UPDATABLE.join(', ')}`);
  }
  checkFieldShapes(body, details);
  if (details.length > 0) return { ok: false, details };

  const fields: IssueFields = {
    filePath: current.filePath,
    line: current.line,
    type: current.type,
    severity: current.severity,
    status: current.status,
    rule: current.rule,
    message: current.message,
    author: current.author,
  };
  for (const key of supplied) {
    (fields as unknown as Record<string, unknown>)[key] = body[key];
  }

  const crossesCommentBoundary = (current.type === 'COMMENT') !== (fields.type === 'COMMENT');
  if (crossesCommentBoundary) {
    details.push(
      `type: cannot change from ${current.type} to ${fields.type}; author is immutable, so an issue cannot move between COMMENT and non-COMMENT types`,
    );
    return { ok: false, details };
  }
  checkTypeInvariant(fields, details);
  return details.length > 0 ? { ok: false, details } : { ok: true, value: fields };
}
