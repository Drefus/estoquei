import { createApp } from '../../src/app.js';
import { testConfig } from '../helpers.js';
import { createTestInventory } from '../inventoryHelpers.js';

export function createApiFixture(clock?: () => Date) {
  const dependencies = createTestInventory(clock);
  return {
    ...dependencies,
    app: createApp({ config: testConfig(), inventory: dependencies.inventory }),
  };
}
