import { createHmac, timingSafeEqual } from 'node:crypto';
import type { LoginRequest, Session, User } from '@peppermill/shared';

import { env } from '../config/env.js';
import { DEMO_PASSWORD } from '../data/seed.js';
import { repositories } from '../repositories/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import { addHours, toIso } from '../utils/dates.js';

/**
 * Demo authentication.
 *
 * Tokens are HMAC-signed payloads rather than JWTs — the goal is to keep the
 * shape of a real session (issue, verify, expire, revoke on role change)
 * without pulling in an auth library for a demo.
 *
 * The password check is intentionally a fixed shared secret. Before this is
 * used for anything real, replace `verifyCredentials` with a proper password
 * hash comparison (argon2/bcrypt) or hand the whole flow to an OIDC provider;
 * nothing outside this file assumes how the credential was validated.
 */

interface TokenPayload {
  userId: string;
  tenantId: string;
  /** Expiry as epoch milliseconds. */
  exp: number;
}

function sign(data: string): string {
  return createHmac('sha256', env.AUTH_SECRET).update(data).digest('base64url');
}

function encodeToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decodeToken(token: string): TokenPayload {
  const [body, signature] = token.split('.');
  if (!body || !signature) throw new UnauthorizedError('Malformed session token');

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on mismatched buffer lengths.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedError('Invalid session token');
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Malformed session token');
  }

  if (payload.exp < Date.now()) throw new UnauthorizedError('Your session has expired');
  return payload;
}

async function verifyCredentials(email: string, password: string, tenantId: string): Promise<User> {
  const user = await repositories.users.findByEmail(tenantId, email);

  // The same message for an unknown address and a wrong password, so the
  // endpoint cannot be used to enumerate who has an account.
  if (!user || password !== DEMO_PASSWORD) {
    throw new UnauthorizedError('Those credentials do not match an account on this workspace');
  }
  if (user.status === 'suspended') {
    throw new UnauthorizedError('This account has been suspended. Contact your administrator.');
  }
  if (user.status === 'invited') {
    throw new UnauthorizedError('This invitation has not been accepted yet.');
  }

  return user;
}

export const authService = {
  async login(input: LoginRequest): Promise<Session> {
    const tenant = await repositories.tenants.findBySlug(input.tenantSlug);
    if (!tenant) throw new UnauthorizedError('Unknown workspace');

    const user = await verifyCredentials(input.email, input.password, tenant.id);
    const expiresAt = addHours(new Date(), env.AUTH_TOKEN_TTL_MINUTES / 60);

    const updated = await repositories.users.update(user.id, {
      lastActiveAt: toIso(new Date()),
    });

    return {
      token: encodeToken({ userId: user.id, tenantId: tenant.id, exp: expiresAt.getTime() }),
      expiresAt: toIso(expiresAt),
      user: updated,
      tenantId: tenant.id,
    };
  },

  /** Resolves a bearer token to the user it belongs to. */
  async resolveSession(token: string): Promise<{ user: User; tenantId: string }> {
    const payload = decodeToken(token);
    const user = await repositories.users.findById(payload.userId);

    if (!user || user.tenantId !== payload.tenantId) {
      throw new UnauthorizedError('This session is no longer valid');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedError('This account is no longer active');
    }

    return { user, tenantId: payload.tenantId };
  },

  demoPassword: DEMO_PASSWORD,
};
