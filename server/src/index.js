import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`☕ LinkPay Server running on port ${config.port}`);
  console.log(`🌐 Base URL: http://localhost:${config.port}/api`);
});
