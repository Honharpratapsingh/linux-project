import express from 'express';

const app = express();

app.use(express.json());

// Health check — the only endpoint in Phase 1
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
