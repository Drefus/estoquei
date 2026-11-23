import { describe, expect, it } from 'vitest';
import type { Movement } from '../../../src/domain/movement.js';
import { InMemoryMovementRepository } from '../../../src/repositories/inMemoryMovementRepository.js';
import { aMovement } from '../domain/builders.js';

const start = new Date('2026-01-15');
const end = new Date('2026-01-17');

async function repositoryWith(...movements: Movement[]): Promise<InMemoryMovementRepository> {
  const repository = new InMemoryMovementRepository();
  for (const movement of movements) await repository.save(movement);
  return repository;
}

describe('InMemoryMovementRepository', () => {
  it('deve registrar e recuperar uma movimentação no histórico do produto', async () => {
    const movement = aMovement();
    const repository = await repositoryWith(movement);

    expect(await repository.listByProduct(movement.productId)).toEqual([movement]);
  });

  it('deve retornar histórico vazio para produto sem movimentações', async () => {
    expect(await new InMemoryMovementRepository().listByProduct('ausente')).toEqual([]);
  });

  it('deve consultar somente as movimentações do produto solicitado', async () => {
    const target = aMovement();
    const other = aMovement({ id: 'outro', productId: 'outro-produto' });
    const repository = await repositoryWith(target, other);

    expect(await repository.listByProduct(target.productId)).toEqual([target]);
  });

  it('deve ordenar o histórico pela data da movimentação em vez da ordem de cadastro', async () => {
    const first = aMovement({ id: 'primeiro', date: new Date('2026-01-15T10:00:00Z') });
    const last = aMovement({ id: 'ultimo', date: new Date('2026-01-16T10:00:00Z') });
    const repository = await repositoryWith(last, first);

    expect(await repository.listByProduct(first.productId)).toEqual([first, last]);
  });

  it('deve desempatar movimentações de mesma data pela ordem do id', async () => {
    const first = aMovement({ id: 'a' });
    const last = aMovement({ id: 'z' });
    const repository = await repositoryWith(last, first);

    expect(await repository.listByProduct(first.productId)).toEqual([first, last]);
  });

  it('deve incluir todos os instantes dos dias inicial e final do período', async () => {
    const first = aMovement({ id: 'inicio', date: new Date('2026-01-15T00:00:00.000Z') });
    const last = aMovement({ id: 'fim', date: new Date('2026-01-17T23:59:59.999Z') });
    const repository = await repositoryWith(last, first);

    expect(await repository.listByPeriod(new Date('2026-01-15T15:00:00Z'), end)).toEqual([
      first,
      last,
    ]);
  });

  it('deve desconsiderar movimentações fora dos dias selecionados', async () => {
    const before = aMovement({ id: 'antes', date: new Date('2026-01-14T23:59:59.999Z') });
    const inside = aMovement({ id: 'dentro' });
    const after = aMovement({ id: 'depois', date: new Date('2026-01-18T00:00:00.000Z') });
    const repository = await repositoryWith(before, inside, after);

    expect(await repository.listByPeriod(start, end)).toEqual([inside]);
  });

  it('deve incluir produtos diferentes e ajustes na consulta por período', async () => {
    const entry = aMovement();
    const adjustment = aMovement({
      id: 'ajuste',
      productId: 'outro',
      type: 'AJUSTE',
      quantity: 0,
      reason: 'Inventário',
    });
    const repository = await repositoryWith(entry, adjustment);

    const movements = await repository.listByPeriod(start, end);

    expect(movements).toHaveLength(2);
    expect(movements).toEqual(expect.arrayContaining([entry, adjustment]));
  });

  it('deve retornar lista vazia quando o período não contém movimentações', async () => {
    const repository = await repositoryWith(aMovement());

    expect(await repository.listByPeriod(new Date('2026-02-01'), new Date('2026-02-02'))).toEqual(
      [],
    );
  });

  it('deve ordenar cronologicamente a consulta por período', async () => {
    const first = aMovement({ id: 'primeiro', date: new Date('2026-01-15T10:00:00Z') });
    const last = aMovement({ id: 'ultimo', date: new Date('2026-01-17T10:00:00Z') });
    const repository = await repositoryWith(last, first);

    expect(await repository.listByPeriod(start, end)).toEqual([first, last]);
  });

  it('deve rejeitar consulta cujo início é posterior ao fim', async () => {
    await expect(new InMemoryMovementRepository().listByPeriod(end, start)).rejects.toThrow(
      RangeError,
    );
  });

  it.each([
    [new Date('inválida'), end],
    [start, new Date('inválida')],
  ])('deve rejeitar consulta com data inválida: %s a %s', async (first, last) => {
    await expect(new InMemoryMovementRepository().listByPeriod(first, last)).rejects.toThrow(
      RangeError,
    );
  });

  it('deve rejeitar id duplicado sem substituir a movimentação registrada', async () => {
    const original = aMovement();
    const repository = await repositoryWith(original);

    await expect(repository.save(aMovement({ quantity: 999 }))).rejects.toThrow(/já cadastrada/);
    expect(await repository.listByProduct(original.productId)).toEqual([original]);
  });

  it('deve proteger os dados salvos contra alterações no objeto recebido', async () => {
    const movement = aMovement({ date: new Date('2026-01-15T12:00:00Z') });
    const original = structuredClone(movement);
    const repository = await repositoryWith(movement);

    movement.quantity = 999;
    movement.date.setUTCFullYear(2000);

    expect(await repository.listByProduct(original.productId)).toEqual([original]);
  });

  it('deve devolver cópias independentes no histórico por produto', async () => {
    const original = aMovement();
    const repository = await repositoryWith(original);
    const movements = await repository.listByProduct(original.productId);

    movements[0]!.quantity = 999;
    movements[0]!.date.setUTCFullYear(2000);
    movements.length = 0;

    expect(await repository.listByProduct(original.productId)).toEqual([original]);
  });

  it('deve devolver cópias independentes na consulta por período', async () => {
    const original = aMovement();
    const repository = await repositoryWith(original);
    const movements = await repository.listByPeriod(start, end);

    movements[0]!.quantity = 999;
    movements[0]!.date.setUTCFullYear(2000);

    expect(await repository.listByPeriod(start, end)).toEqual([original]);
  });
});
