import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Talvo Admin API running on port ${PORT}`);
  console.log(`📚 Docs: http://localhost:${PORT}/docs`);
});