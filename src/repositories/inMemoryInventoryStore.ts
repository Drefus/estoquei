import { InMemoryMovementRepository } from './inMemoryMovementRepository.js';
import { InMemoryProductRepository } from './inMemoryProductRepository.js';
import type { InventoryRepositories, InventoryStore } from './inventoryStore.js';

export class InMemoryInventoryStore implements InventoryStore {
  private state = {
    products: new InMemoryProductRepository(),
    movements: new InMemoryMovementRepository(),
  };
  private pending = Promise.resolve();

  get repositories(): InventoryRepositories {
    return this.state;
  }

  async transaction<T>(work: (repositories: InventoryRepositories) => Promise<T>): Promise<T> {
    const previous = this.pending;
    let release!: () => void;
    this.pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      const draft = {
        products: this.state.products.clone(),
        movements: this.state.movements.clone(),
      };
      const result = await work(draft);
      this.state = draft;
      return result;
    } finally {
      release();
    }
  }
}
