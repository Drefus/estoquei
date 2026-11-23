import { InMemoryInventoryStore } from '../src/repositories/inMemoryInventoryStore.js';
import { InventoryService } from '../src/services/inventoryService.js';

export const TEST_NOW = '2026-01-21T12:00:00.000Z';

export function createTestInventory(clock: () => Date = () => new Date(TEST_NOW)) {
  const store = new InMemoryInventoryStore();
  let sequence = 0;
  const inventory = new InventoryService({ store, clock, createId: () => `id-${++sequence}` });
  return { store, inventory };
}
