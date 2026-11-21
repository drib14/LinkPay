import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT) || 5000;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value of at least 32 characters in server/.env');
  process.exit(1);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`LinkPay API running at http://localhost:${port}`);
});
