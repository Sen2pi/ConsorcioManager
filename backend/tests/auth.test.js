const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } = require('./setup');
const { createTestGestor, validateErrorResponse, validateSuccessResponse } = require('./helpers');
const { Gestor } = require('../models');

describe('Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const gestor = await createTestGestor();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gestor@teste.com',
          senha: 'senha123456'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login realizado com sucesso');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('gestor');
      expect(response.body.gestor).toHaveProperty('id', gestor.id);
      expect(response.body.gestor).toHaveProperty('nome', gestor.nome);
      expect(response.body.gestor).toHaveProperty('email', gestor.email);
    });

    it('deve retornar erro com email inválido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'email@inexistente.com',
          senha: 'senha123456'
        });

      validateErrorResponse(response, 401);
      expect(response.body.message).toBe('Credenciais inválidas');
    });

    it('deve retornar erro com senha inválida', async () => {
      await createTestGestor();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gestor@teste.com',
          senha: 'senhaerrada'
        });

      validateErrorResponse(response, 401);
      expect(response.body.message).toBe('Credenciais inválidas');
    });

    it('deve retornar erro com gestor inativo', async () => {
      await createTestGestor({ ativo: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gestor@teste.com',
          senha: 'senha123456'
        });

      validateErrorResponse(response, 401);
      expect(response.body.message).toBe('Conta desativada');
    });

    it('deve validar dados obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      validateErrorResponse(response, 400);
    });

    it('deve validar formato de email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'email-invalido',
          senha: 'senha123456'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar tamanho mínimo da senha', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gestor@teste.com',
          senha: '123'
        });

      validateErrorResponse(response, 400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('deve registrar novo gestor com dados válidos', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Novo Gestor',
          email: 'novo@gestor.com',
          senha: 'senha123456',
          telefone: '+5511777777777'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Gestor criado com sucesso');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('gestor');
      expect(response.body.gestor).toHaveProperty('nome', 'Novo Gestor');
      expect(response.body.gestor).toHaveProperty('email', 'novo@gestor.com');
      expect(response.body.gestor).not.toHaveProperty('senha');
    });

    it('deve retornar erro com email já existente', async () => {
      await createTestGestor();

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Outro Gestor',
          email: 'gestor@teste.com',
          senha: 'senha123456',
          telefone: '+5511777777777'
        });

      validateErrorResponse(response, 409);
      expect(response.body.message).toBe('Email já está em uso');
    });

    it('deve validar dados obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Gestor',
          email: 'gestor@teste.com'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar formato de email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Gestor',
          email: 'email-invalido',
          senha: 'senha123456'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar tamanho mínimo da senha', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Gestor',
          email: 'gestor@teste.com',
          senha: '123'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar tamanho mínimo do nome', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'A',
          email: 'gestor@teste.com',
          senha: 'senha123456'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar formato do telefone', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Gestor',
          email: 'gestor@teste.com',
          senha: 'senha123456',
          telefone: 'telefone-invalido'
        });

      validateErrorResponse(response, 400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('deve retornar dados do gestor autenticado', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('gestor');
      expect(response.body.gestor).toHaveProperty('id', gestor.id);
      expect(response.body.gestor).toHaveProperty('nome', gestor.nome);
      expect(response.body.gestor).toHaveProperty('email', gestor.email);
      expect(response.body.gestor).not.toHaveProperty('senha');
    });

    it('deve retornar erro sem token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      validateErrorResponse(response, 401);
      expect(response.body.message).toBe('Token de acesso requerido');
    });

    it('deve retornar erro com token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token-invalido');

      validateErrorResponse(response, 403);
      expect(response.body.message).toBe('Token inválido');
    });

    it('deve retornar erro com gestor inativo', async () => {
      const gestor = await createTestGestor({ ativo: false });
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 401);
      expect(response.body.message).toBe('Gestor não encontrado ou inativo');
    });
  });
});
