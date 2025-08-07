const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Gestor, Participante, Consorcio, ConsorcioParticipante } = require('../models');

// Criar gestor de teste
const createTestGestor = async (gestorData = {}) => {
  const defaultData = {
    nome: 'Gestor Teste',
    email: 'gestor@teste.com',
    senha: 'senha123456',
    telefone: '+5511999999999',
    ativo: true
  };

  const data = { ...defaultData, ...gestorData };
  data.senha = await bcrypt.hash(data.senha, 12);

  return await Gestor.create(data);
};

// Criar participante de teste
const createTestParticipante = async (gestorId, participanteData = {}) => {
  const defaultData = {
    nome: 'Participante Teste',
    telefone: '+5511888888888',
    pix_iban: 'teste@teste.com',
    ativo: true
  };

  const data = { ...defaultData, ...participanteData, gestorId };
  return await Participante.create(data);
};

// Criar consórcio de teste
const createTestConsorcio = async (gestorId, consorcioData = {}) => {
  const defaultData = {
    nome: 'Consórcio Teste',
    montante_total: 10000.00,
    prazo_meses: 12,
    numero_cotas: 20,
    status: 'ativo',
    data_inicio: '2024-01-01',
    descricao: 'Consórcio para testes'
  };

  const data = { ...defaultData, ...consorcioData, gestorId };
  return await Consorcio.create(data);
};

// Gerar token JWT para testes
const generateTestToken = (gestorId) => {
  return jwt.sign(
    { gestorId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Criar dados de teste completos
const createTestData = async () => {
  const gestor = await createTestGestor();
  const participante = await createTestParticipante(gestor.id);
  const consorcio = await createTestConsorcio(gestor.id);
  
  const token = generateTestToken(gestor.id);

  return {
    gestor,
    participante,
    consorcio,
    token
  };
};

// Validar resposta de erro padrão
const validateErrorResponse = (response, expectedStatus = 400) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('message');
  expect(typeof response.body.message).toBe('string');
};

// Validar resposta de sucesso padrão
const validateSuccessResponse = (response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeDefined();
};

module.exports = {
  createTestGestor,
  createTestParticipante,
  createTestConsorcio,
  generateTestToken,
  createTestData,
  validateErrorResponse,
  validateSuccessResponse
};
