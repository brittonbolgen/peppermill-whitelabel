import { z } from 'zod';
import { ROLE_IDS } from '../constants/roles.js';

export const userRoleSchema = z.enum(ROLE_IDS);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userStatusSchema = z.enum(['active', 'invited', 'suspended']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  status: userStatusSchema,
  jobTitle: z.string(),
  department: z.string(),
  /** Deterministic avatar tint so a user looks the same on every screen. */
  avatarColor: z.string(),
  mfaEnabled: z.boolean(),
  lastActiveAt: z.string().nullable(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  role: userRoleSchema,
  jobTitle: z.string().default(''),
  department: z.string().default(''),
});
export type UserCreate = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = userCreateSchema.partial().extend({
  status: userStatusSchema.optional(),
  mfaEnabled: z.boolean().optional(),
});
export type UserUpdate = z.infer<typeof userUpdateSchema>;

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

export const loginRequestSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: userSchema,
  tenantId: z.string(),
});
export type Session = z.infer<typeof sessionSchema>;
