import { SESSION_COOKIE } from '@sanjeevani/config';
import type { CookieOptions, RequestHandler, Response } from 'express';
import { AppError } from '../lib/errors';
import { ROLE_RANK, type Role } from '../repositories/types';
import type { AuthService, IssuedSession } from '../services/auth-service';

function tokenFrom(req: Parameters<RequestHandler>[0]): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  return cookie ?? null;
}

/** Attaches req.auth when a valid session is present. Never rejects. */
export function loadAuth(auth: AuthService): RequestHandler {
  return async (req, _res, next) => {
    const token = tokenFrom(req);
    if (token) req.auth = (await auth.verify(token)) ?? undefined;
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(AppError.unauthorized());
  next();
};

/**
 * Requires *at least* this role.
 *
 * A floor rather than an equality test, so an administrator can open the review
 * console without a second account — the alternative being either two logins per
 * person or, far worse, reviewers quietly handed the operator role because that is
 * the one the check happened to name.
 *
 * It does not work in the other direction: `ROLE_RANK` puts REVIEWER below ADMIN, so
 * nothing a reviewer holds reaches the operator surface.
 */
export function requireRole(role: Role): RequestHandler {
  const floor = ROLE_RANK[role];
  return (req, _res, next) => {
    if (!req.auth) return next(AppError.unauthorized());
    if (ROLE_RANK[req.auth.role] < floor) return next(AppError.forbidden());
    next();
  };
}

export function cookieOptions(secure: boolean, expires?: Date): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', ...(expires ? { expires } : {}) };
}

export function setSessionCookie(res: Response, session: IssuedSession, secure: boolean) {
  res.cookie(SESSION_COOKIE, session.token, cookieOptions(secure, session.expiresAt));
}

export function clearSessionCookie(res: Response, secure: boolean) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(secure));
}
