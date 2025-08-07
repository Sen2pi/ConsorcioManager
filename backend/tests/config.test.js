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

describe('Configurações', () => {
  it('deve carregar as configurações de teste', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DB_NAME).toBe('consorcio_manager_test');
    expect(process.env.JWT_SECRET).toBe('test-secret-key-for-testing-only');
  });

  it('deve ter todas as variáveis de ambiente necessárias', () => {
    const requiredVars = [
      'NODE_ENV',
      'DB_NAME',
      'DB_USER', 
      'DB_HOST',
      'DB_PORT',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'PORT',
      'FRONTEND_URL'
    ];

    requiredVars.forEach(varName => {
      expect(process.env[varName]).toBeDefined();
    });
  });
});

module.exports = {
  // Configurações podem ser acessadas aqui se necessário
};
