import type { MovementRepository } from './movementRepository.js';
import type { ProductRepository } from './productRepository.js';

export interface InventoryRepositories {
  products: ProductRepository;
  movements: MovementRepository;
}

/** Escritas usam transaction; repositories fornece uma visão consistente para leitura. */
export interface InventoryStore {
  readonly repositories: InventoryRepositories;
  transaction<T>(work: (repositories: InventoryRepositories) => Promise<T>): Promise<T>;
}
