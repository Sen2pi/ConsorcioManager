// Configurações de teste
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'consorcio_manager_test';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = 'root';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '5001';
process.env.FRONTEND_URL = 'http://localhost:3000';

module.exports = {
  // Configurações podem ser acessadas aqui se necessário
};
