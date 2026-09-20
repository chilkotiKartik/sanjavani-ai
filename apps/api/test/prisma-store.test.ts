/**
 * Integration test against a real PostgreSQL database.
 * Runs only when TEST_DATABASE_URL points at a migrated, disposable database:
 *   TEST_DATABASE_URL=postgresql://…/sanjeevani_test npm test
 */
import { loadServerConfig } from '@sanjeevani/config/server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createContainer, type Container } from '../src/container';
import { createLogger } from '../src/lib/logger';

const url = process.env.TEST_DATABASE_URL;
const REVIEWER_KEY = 'a-very-long-reviewer-access-key-1234';

describe.skipIf(!url)('Postgres persistence', () => {
  let container: Container;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const config = loadServerConfig({
      NODE_ENV: 'test',
      PERSISTENCE: 'postgres',
      DATABASE_URL: url,
      PROVIDER_MODE: 'mock',
      REVIEWER_ACCESS_KEY: REVIEWER_KEY,
    });
    container = await createContainer(config, createLogger('silent', false));
    app = createApp(container);
  });

  afterAll(async () => {
    await container?.close();
  });

  it('persists a full turn transactionally and supports deletion', async () => {
    expect(container.store.kind).toBe('postgres');
    const agent = request.agent(app);
    await agent.post('/v1/auth/session').send({});
    const { body: conv } = await agent.post('/v1/conversations').send({});
    const location = { lat: 28.4952, lng: 77.0888, origin: 'demo' };
    await agent.post(`/v1/conversations/${conv.id}/turns`).send({ text: 'I have had a high fever for two days', location });
    const advice = await agent.post(`/v1/conversations/${conv.id}/turns`).send({ text: 'no', location });
    expect(advice.body.phase).toBe('advice');
    expect(advice.body.degraded).not.toContain('persistence_unavailable');

    const detail = await agent.get(`/v1/conversations/${conv.id}`);
    expect(detail.body.messages).toHaveLength(4);
    expect(detail.body.timeline[0].code).toBe('fever');
    const latest = await container.store.triage.latest(conv.id);
    expect(latest?.urgency).toBe('urgent');

    const emergency = await agent.post(`/v1/conversations/${conv.id}/turns`).send({ text: 'now he is unconscious', location });
    expect(emergency.body.phase).toBe('emergency');
    await agent.post(`/v1/conversations/${conv.id}/emergency-actions`).send({ action: 'dismissed' });

    const cached = await container.store.facilityCache.get('curated_directory|emergency_department|emergency_medicine|en|28.495|77.089');
    expect(Array.isArray(cached)).toBe(true);

    const { userId } = (await agent.get('/v1/auth/session')).body as { userId: string };
    expect(await container.store.conversations.findForUser(conv.id, userId)).not.toBeNull();
    expect((await agent.delete('/v1/privacy/data')).status).toBe(200);
    expect(await container.store.conversations.findForUser(conv.id, userId)).toBeNull();
    expect(await container.store.users.findById(userId)).toBeNull();
  });

  it('serves the seeded curated directory', async () => {
    const records = await container.store.facilities.listCurated('gurugram');
    expect(records.length).toBeGreaterThanOrEqual(6);
  });

  /*
   * The clinician review path against real SQL.
   *
   * The in-memory store is a faithful reimplementation, which is exactly why this has
   * to run somewhere: the things most likely to differ are the ones only Postgres
   * enforces — the unique index that makes a duplicate review a 409 rather than a
   * second row, and `ON DELETE SET NULL`, which is what lets a review outlive the
   * conversation it judged. Neither is observable in a Map.
   */
  it('reviews a real decision, survives a purge, and refuses a duplicate', async () => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/session').send({});
    const { body: conv } = await agent.post('/v1/conversations').send({});
    const location = { lat: 28.4952, lng: 77.0888, origin: 'demo' };
    await agent.post(`/v1/conversations/${conv.id}/turns`).send({ text: 'I have had a high fever and body ache for two days', location });
    await agent.post(`/v1/conversations/${conv.id}/turns`).send({ text: 'no', location });

    const login = await request(app).post('/v1/auth/reviewer').send({ accessKey: REVIEWER_KEY });
    expect(login.status).toBe(201);
    const auth = { Authorization: `Bearer ${login.body.token}` };

    const queue = await request(app).get('/v1/review/queue').set(auth);
    expect(queue.status).toBe(200);
    const target = queue.body.cases.find((c: { symptoms: { code: string }[] }) => c.symptoms.some((s) => s.code === 'fever'));
    expect(target).toBeDefined();
    // The columns added for the queue really did persist through the real transaction.
    expect(target.symptoms[0].severity).not.toBe('unknown');
    expect(target.ageGroup).toBeTruthy();
    expect(JSON.stringify(queue.body)).not.toContain(conv.id);

    expect((await request(app).post(`/v1/review/${target.id}`).set(auth).send({ verdict: 'URGENCY_TOO_HIGH', suggestedUrgency: 'routine' })).status).toBe(201);
    // Enforced by the unique index, not by a prior read.
    expect((await request(app).post(`/v1/review/${target.id}`).set(auth).send({ verdict: 'AGREE' })).status).toBe(409);

    const before = await request(app).get('/v1/review/stats').set(auth);
    expect(before.body.byVerdict.URGENCY_TOO_HIGH).toBeGreaterThanOrEqual(1);
    expect(before.body.contestedRules.length).toBeGreaterThan(0);

    // Deleting the person's data takes the conversation and its decisions with it.
    expect((await agent.delete('/v1/privacy/data')).status).toBe(200);
    expect(await container.store.reviews.caseById(target.id)).toBeNull();

    // The finding remains, with the evidence it was recorded against.
    const after = await request(app).get('/v1/review/stats').set(auth);
    expect(after.body.byVerdict.URGENCY_TOO_HIGH).toBe(before.body.byVerdict.URGENCY_TOO_HIGH);
    expect(after.body.contestedRules.length).toBeGreaterThan(0);
  });
});
