import { describe, expect, it } from 'vitest';
import { DuplicateSkuError, ProductNotFoundError } from '../../../src/domain/errors.js';
import type { Product } from '../../../src/domain/product.js';
import { InMemoryProductRepository } from '../../../src/repositories/inMemoryProductRepository.js';
import { aProduct } from '../domain/builders.js';

async function repositoryWith(...products: Product[]): Promise<InMemoryProductRepository> {
  const repository = new InMemoryProductRepository();
  for (const product of products) await repository.save(product);
  return repository;
}

describe('InMemoryProductRepository', () => {
  it('deve cadastrar e recuperar um produto pelo id', async () => {
    const product = aProduct();
    const repository = await repositoryWith(product);

    expect(await repository.findById(product.id)).toEqual(product);
  });

  it('deve retornar nulo ao buscar id inexistente', async () => {
    expect(await new InMemoryProductRepository().findById('ausente')).toBeNull();
  });

  it('deve localizar um produto pelo SKU', async () => {
    const product = aProduct();
    const repository = await repositoryWith(product);

    expect(await repository.findBySku(product.sku)).toEqual(product);
  });

  it('deve retornar nulo ao buscar SKU inexistente', async () => {
    const repository = await repositoryWith(aProduct());

    expect(await repository.findBySku('AUS-001')).toBeNull();
  });

  it('deve rejeitar cadastro com id existente sem substituir o produto original', async () => {
    const original = aProduct();
    const repository = await repositoryWith(original);

    await expect(repository.save(aProduct({ sku: 'OUT-001' }))).rejects.toThrow(/já cadastrado/);
    expect(await repository.findById(original.id)).toEqual(original);
  });

  it('deve rejeitar cadastro com SKU duplicado sem inserir outro produto', async () => {
    const original = aProduct();
    const repository = await repositoryWith(original);

    await expect(repository.save(aProduct({ id: 'outro' }))).rejects.toThrow(DuplicateSkuError);
    expect(await repository.list()).toEqual([original]);
  });

  it('deve atualizar os dados de um produto já cadastrado', async () => {
    const product = aProduct();
    const repository = await repositoryWith(product);
    const updated = { ...product, name: 'Café especial', quantity: 20 };

    await repository.update(updated);

    expect(await repository.findById(product.id)).toEqual(updated);
  });

  it('deve permitir atualizar o produto mantendo seu próprio SKU', async () => {
    const product = aProduct();
    const repository = await repositoryWith(product);

    await repository.update({ ...product, minStock: 8 });

    expect(await repository.findBySku(product.sku)).toEqual({ ...product, minStock: 8 });
  });

  it('deve localizar o produto pelo novo SKU depois de uma atualização', async () => {
    const product = aProduct();
    const repository = await repositoryWith(product);

    await repository.update({ ...product, sku: 'NOV-001' });

    expect(await repository.findBySku(product.sku)).toBeNull();
    expect(await repository.findBySku('NOV-001')).toEqual({ ...product, sku: 'NOV-001' });
  });

  it('deve impedir atualização de produto inexistente', async () => {
    await expect(new InMemoryProductRepository().update(aProduct())).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it('deve impedir atualização para SKU de outro produto sem modificar o original', async () => {
    const first = aProduct();
    const second = aProduct({ id: 'segundo', sku: 'SEG-001' });
    const repository = await repositoryWith(first, second);

    await expect(repository.update({ ...second, sku: first.sku })).rejects.toThrow(
      DuplicateSkuError,
    );
    expect(await repository.findById(second.id)).toEqual(second);
  });

  it('deve retornar lista vazia quando não há produtos cadastrados', async () => {
    expect(await new InMemoryProductRepository().list()).toEqual([]);
  });

  it('deve listar produtos ativos e inativos quando não há filtros', async () => {
    const active = aProduct();
    const inactive = aProduct({ id: 'inativo', sku: 'INA-001', active: false });
    const repository = await repositoryWith(active, inactive);

    const products = await repository.list();

    expect(products).toHaveLength(2);
    expect(products).toEqual(expect.arrayContaining([active, inactive]));
  });

  it('deve buscar por trecho do nome sem diferenciar letras maiúsculas', async () => {
    const coffee = aProduct();
    const soap = aProduct({ id: 'sabao', sku: 'SAB-001', name: 'Sabão' });
    const repository = await repositoryWith(coffee, soap);

    expect(await repository.list({ search: '  CAFÉ  ' })).toEqual([coffee]);
  });

  it('deve buscar por trecho do SKU sem diferenciar letras maiúsculas', async () => {
    const coffee = aProduct();
    const repository = await repositoryWith(coffee);

    expect(await repository.list({ search: 'caf-5' })).toEqual([coffee]);
  });

  it('deve filtrar produtos pela categoria', async () => {
    const coffee = aProduct();
    const soap = aProduct({ id: 'sabao', sku: 'SAB-001', name: 'Sabão', category: 'Limpeza' });
    const repository = await repositoryWith(coffee, soap);

    expect(await repository.list({ category: ' Limpeza ' })).toEqual([soap]);
  });

  it('deve considerar saldo igual ao mínimo no filtro de estoque baixo', async () => {
    const low = aProduct({ id: 'baixo', sku: 'BAI-001', quantity: 1, minStock: 5 });
    const equal = aProduct({ id: 'igual', sku: 'IGU-001', quantity: 5, minStock: 5 });
    const high = aProduct({ id: 'alto', sku: 'ALT-001', quantity: 6, minStock: 5 });
    const repository = await repositoryWith(low, equal, high);

    const products = await repository.list({ lowStockOnly: true });

    expect(products).toHaveLength(2);
    expect(products).toEqual(expect.arrayContaining([low, equal]));
  });

  it('deve excluir produtos inativos quando o filtro de ativos é informado', async () => {
    const active = aProduct();
    const inactive = aProduct({ id: 'inativo', sku: 'INA-001', active: false });
    const repository = await repositoryWith(active, inactive);

    expect(await repository.list({ activeOnly: true })).toEqual([active]);
  });

  it('deve aplicar busca, categoria, estoque baixo e situação ao mesmo tempo', async () => {
    const target = aProduct({ quantity: 1 });
    const otherCategory = aProduct({
      id: 'categoria',
      sku: 'CAT-001',
      quantity: 1,
      category: 'Bebidas',
    });
    const inactive = aProduct({ id: 'inativo', sku: 'INA-001', quantity: 1, active: false });
    const highStock = aProduct({ id: 'saldo', sku: 'SAL-001', quantity: 10 });
    const repository = await repositoryWith(target, otherCategory, inactive, highStock);

    expect(
      await repository.list({
        search: 'café',
        category: 'Mercearia',
        lowStockOnly: true,
        activeOnly: true,
      }),
    ).toEqual([target]);
  });

  it('deve ignorar filtros de texto vazios e opções marcadas como falsas', async () => {
    const product = aProduct({ active: false });
    const repository = await repositoryWith(product);

    expect(
      await repository.list({ search: ' ', category: ' ', activeOnly: false, lowStockOnly: false }),
    ).toEqual([product]);
  });

  it('deve proteger os dados salvos contra alterações no objeto recebido', async () => {
    const product = aProduct({ createdAt: new Date('2026-01-15T12:00:00Z') });
    const original = structuredClone(product);
    const repository = await repositoryWith(product);

    product.quantity = 999;
    product.createdAt.setUTCFullYear(2000);

    expect(await repository.findById(original.id)).toEqual(original);
  });

  it('deve proteger os dados atualizados contra alterações posteriores no objeto recebido', async () => {
    const product = aProduct();
    const repository = await repositoryWith(product);
    const updated = { ...product, quantity: 20 };
    await repository.update(updated);

    updated.quantity = 999;

    expect(await repository.findById(product.id)).toEqual({ ...product, quantity: 20 });
  });

  it('deve devolver uma cópia independente na consulta por id', async () => {
    const original = aProduct();
    const repository = await repositoryWith(original);
    const found = (await repository.findById(original.id))!;

    found.quantity = 999;
    found.createdAt.setUTCFullYear(2000);

    expect(await repository.findById(original.id)).toEqual(original);
  });

  it('deve devolver uma cópia independente na consulta por SKU', async () => {
    const original = aProduct();
    const repository = await repositoryWith(original);
    const found = (await repository.findBySku(original.sku))!;

    found.quantity = 999;
    found.createdAt.setUTCFullYear(2000);

    expect(await repository.findById(original.id)).toEqual(original);
  });

  it('deve devolver cópias independentes dos produtos listados', async () => {
    const original = aProduct();
    const repository = await repositoryWith(original);
    const products = await repository.list();

    products[0]!.quantity = 999;
    products[0]!.createdAt.setUTCFullYear(2000);
    products.length = 0;

    expect(await repository.findById(original.id)).toEqual(original);
  });
});
