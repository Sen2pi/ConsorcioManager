const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const setupDatabase = require('./config/setupDatabase');
const { iniciarJobs } = require('./jobs/verificarPagamentos');

const authRoutes = require('./routes/auth');
const gestorRoutes = require('./routes/gestores');
const participanteRoutes = require('./routes/participantes');
const consorcioRoutes = require('./routes/consorcios');
const timelineRoutes = require('./routes/timeline');

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/gestores', gestorRoutes);
app.use('/api/participantes', participanteRoutes);
app.use('/api/consorcios', consorcioRoutes);
app.use('/api/timeline', timelineRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Só iniciar o servidor se não estiver em modo de teste
if (process.env.NODE_ENV !== 'test') {
  setupDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      // Iniciar jobs de verificação
      iniciarJobs();
    });
  }).catch(error => {
    console.error('Falha ao inicializar:', error);
    process.exit(1);
  });
}

module.exports = app;