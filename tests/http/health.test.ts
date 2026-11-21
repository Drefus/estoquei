import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { testConfig } from '../helpers.js';

describe('GET /health', () => {
  it('deve responder 200 com status ok', async () => {
    const app = createApp({ config: testConfig() });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('deve responder 404 para rota inexistente', async () => {
    const app = createApp({ config: testConfig() });

    const response = await request(app).get('/rota-que-nao-existe');

    expect(response.status).toBe(404);
  });
});
