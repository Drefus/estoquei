import { createApp } from '../../src/app.js';
import { testConfig } from '../helpers.js';
import { createTestInventory } from '../inventoryHelpers.js';

export function createApiFixture() {
  const dependencies = createTestInventory();
  return {
    ...dependencies,
    app: createApp({ config: testConfig(), inventory: dependencies.inventory }),
  };
}
