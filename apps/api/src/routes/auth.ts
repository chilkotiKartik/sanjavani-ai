import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { Container } from '../container';
import { hashIp, safeEqual } from '../lib/crypto';
import { AppError } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../middleware/auth';
import { languagePreferenceSchema } from '@sanjeevani/types';

export function authRoutes(c: Container, sessionLimit: RequestHandler): Router {
  const router = Router();
  const secure = c.config.isProduction;

  /** Starts (or resumes) an anonymous session. No personal data is requested. */
  router.post('/v1/auth/session', sessionLimit, async (req, res) => {
    if (req.auth) {
      res.json({ userId: req.auth.userId, anonymous: req.auth.anonymous, resumed: true });
      return;
    }
    const body = parseBody(z.object({ languagePreference: languagePreferenceSchema.default('auto') }), req.body);
    const session = await c.auth.createAnonymousSession(body.languagePreference);
    setSessionCookie(res, session, secure);
    await c.store.audit.add({
      userId: session.context.userId,
      action: 'session.created',
      resourceType: 'session',
      resourceId: session.context.sessionId,
      requestId: req.requestId,
      ipHash: hashIp(req.ip, c.config.JWT_SECRET),
    });
    res.status(201).json({ userId: session.context.userId, anonymous: true, expiresAt: session.expiresAt.toISOString() });
  });

  router.get('/v1/auth/session', requireAuth, (req, res) => {
    res.json({ userId: req.auth!.userId, anonymous: req.auth!.anonymous, role: req.auth!.role });
  });

  router.delete('/v1/auth/session', requireAuth, async (req, res) => {
    await c.auth.revoke(req.auth!);
    clearSessionCookie(res, secure);
    res.status(204).end();
  });

  /**
   * Sign-in for a privileged role, by shared key.
   *
   * Both surfaces work the same way and neither reveals anything when it is switched
   * off: with no key configured the route 404s rather than 401s, because a 401 tells
   * an unauthenticated caller that an operator or reviewer console exists here.
   *
   * The comparison is constant-time, a failure is audited with a salted hash of the
   * caller's IP (enough to spot someone grinding at it, not enough to identify them),
   * and the key never appears in a log line, an error or a response.
   */
  const staffLogin = (path: string, keyFor: () => string | undefined, role: 'ADMIN' | 'REVIEWER', label: string) => {
    router.post(path, sessionLimit, async (req, res) => {
      const configured = keyFor();
      if (!configured || configured.length < 24) throw AppError.notFound('This endpoint does not exist.');
      const { accessKey } = parseBody(z.object({ accessKey: z.string().min(1).max(256) }), req.body);
      if (!safeEqual(accessKey, configured)) {
        await c.store.audit.add({
          action: `${label}.login_failed`,
          resourceType: 'session',
          requestId: req.requestId,
          ipHash: hashIp(req.ip, c.config.JWT_SECRET),
        });
        throw AppError.unauthorized('Invalid access key.');
      }
      const session = await c.auth.createStaffSession(role);
      await c.store.audit.add({ userId: session.context.userId, action: `${label}.login`, resourceType: 'session', requestId: req.requestId });
      res.status(201).json({ token: session.token, role, expiresAt: session.expiresAt.toISOString() });
    });
  };

  staffLogin('/v1/auth/admin', () => c.config.ADMIN_ACCESS_KEY, 'ADMIN', 'admin');
  staffLogin('/v1/auth/reviewer', () => c.config.REVIEWER_ACCESS_KEY, 'REVIEWER', 'reviewer');

  return router;
}
