/**
 * @peppermill/shared
 *
 * The single source of truth for the portal's domain model.
 *
 * Every entity is declared once as a Zod schema and its TypeScript type is
 * inferred from it. The API validates request and response payloads against
 * these schemas; the web client imports the same types. A field can therefore
 * never drift between the two halves of the stack.
 */

export * from './schemas/common.js';
export * from './schemas/tenant.js';
export * from './schemas/user.js';
export * from './schemas/case.js';
export * from './schemas/alert.js';
export * from './schemas/analytics.js';
export * from './schemas/notification.js';
export * from './schemas/monitoring.js';
export * from './schemas/support.js';

export * from './constants/reason-codes.js';
export * from './constants/roles.js';
export * from './constants/card-brands.js';

export * from './utils/money.js';
