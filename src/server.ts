import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`Prateleira ouvindo em http://localhost:${config.port} (storage=${config.storage})`);
});
