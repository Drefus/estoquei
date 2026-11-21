import { expect, test } from '@playwright/test';

test('servidor deve responder ao health check', async ({ request }) => {
  const response = await request.get('/health');

  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok' });
});
