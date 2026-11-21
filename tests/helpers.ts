import type { AppConfig } from '../src/config.js';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return { port: 0, storage: 'memory', databaseUrl: undefined, ...overrides };
}
