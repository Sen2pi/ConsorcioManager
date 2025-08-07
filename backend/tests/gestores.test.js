const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } = require('./setup');
const { createTestGestor, validateErrorResponse, validateSuccessResponse } = require('./helpers');
const { Gestor } = require('../models');

describe('Gestores Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('GET /api/gestores/profile', () => {
    it('deve retornar perfil do gestor autenticado', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('gestor');
      expect(response.body.gestor).toHaveProperty('id', gestor.id);
      expect(response.body.gestor).toHaveProperty('nome', gestor.nome);
      expect(response.body.gestor).toHaveProperty('email', gestor.email);
      expect(response.body.gestor).toHaveProperty('telefone', gestor.telefone);
      expect(response.body.gestor).toHaveProperty('createdAt');
      expect(response.body.gestor).not.toHaveProperty('senha');
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .get('/api/gestores/profile');

      validateErrorResponse(response, 401);
    });
  });

  describe('PUT /api/gestores/profile', () => {
    it('deve atualizar nome do gestor', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Nome Atualizado'
        });

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Perfil atualizado com sucesso');
      expect(response.body.gestor).toHaveProperty('nome', 'Nome Atualizado');
    });

    it('deve atualizar telefone do gestor', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          telefone: '+5511666666666'
        });

      validateSuccessResponse(response);
      expect(response.body.gestor).toHaveProperty('telefone', '+5511666666666');
    });

    it('deve atualizar senha do gestor', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          senha: 'novaSenha123'
        });

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Perfil atualizado com sucesso');

      // Verificar se a senha foi atualizada
      const gestorAtualizado = await Gestor.findByPk(gestor.id);
      const senhaValida = await bcrypt.compare('novaSenha123', gestorAtualizado.senha);
      expect(senhaValida).toBe(true);
    });

    it('deve atualizar múltiplos campos', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Nome Completo',
          telefone: '+5511555555555',
          senha: 'outraSenha123'
        });

      validateSuccessResponse(response);
      expect(response.body.gestor).toHaveProperty('nome', 'Nome Completo');
      expect(response.body.gestor).toHaveProperty('telefone', '+5511555555555');
    });

    it('deve validar formato do telefone', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          telefone: 'telefone-invalido'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar tamanho mínimo da senha', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          senha: '123'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar tamanho mínimo do nome', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'A'
        });

      validateErrorResponse(response, 400);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .put('/api/gestores/profile')
        .send({
          nome: 'Nome Atualizado'
        });

      validateErrorResponse(response, 401);
    });
  });

  describe('DELETE /api/gestores/profile', () => {
    it('deve desativar conta do gestor', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete('/api/gestores/profile')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Conta desativada com sucesso');

      // Verificar se o gestor foi desativado
      const gestorDesativado = await Gestor.findByPk(gestor.id);
      expect(gestorDesativado.ativo).toBe(false);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .delete('/api/gestores/profile');

      validateErrorResponse(response, 401);
    });
  });
});
