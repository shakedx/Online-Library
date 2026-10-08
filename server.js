import { createApp } from './backend/src/app.js';

const app = createApp();

const port = Number(process.env.PORT || 3000);

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(port, '127.0.0.1', () => {
    console.log(`Online Library: http://127.0.0.1:${port}`);
  });
}

export default app;
