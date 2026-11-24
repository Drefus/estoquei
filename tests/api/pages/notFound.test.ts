import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiFixture } from '../helpers.js';

describe('página 404 e arquivos estáticos', () => {
  it('deve exibir página amigável para endereço inexistente', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/pagina-que-nao-existe');

    expect(response.status).toBe(404);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('data-testid="not-found"');
    expect(response.text).toContain('Voltar ao painel');
  });

  it('deve manter resposta JSON para rotas inexistentes da API', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/api/nao-existe');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('deve servir a folha de estilos', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/styles.css');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/css');
  });
});
