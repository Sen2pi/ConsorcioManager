const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } = require('./setup');
const { createTestGestor, createTestParticipante, validateErrorResponse, validateSuccessResponse } = require('./helpers');
const { Participante } = require('../models');

describe('Participantes Routes', () => {
  let gestor, token;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    gestor = await createTestGestor();
    token = jwt.sign(
      { gestorId: gestor.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('GET /api/participantes', () => {
    it('deve listar participantes do gestor', async () => {
      await createTestParticipante(gestor.id);
      await createTestParticipante(gestor.id, {
        nome: 'Outro Participante',
        telefone: '+5511777777777',
        pix_iban: 'outro@teste.com'
      });

      const response = await request(app)
        .get('/api/participantes')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('participantes');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.participantes).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
    });

    it('deve filtrar participantes por busca', async () => {
      await createTestParticipante(gestor.id);
      await createTestParticipante(gestor.id, {
        nome: 'João Silva',
        telefone: '+5511777777777',
        pix_iban: 'joao@teste.com'
      });

      const response = await request(app)
        .get('/api/participantes?search=João')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body.participantes).toHaveLength(1);
      expect(response.body.participantes[0].nome).toBe('João Silva');
    });

    it('deve paginar resultados', async () => {
      // Criar 15 participantes
      for (let i = 1; i <= 15; i++) {
        await createTestParticipante(gestor.id, {
          nome: `Participante ${i}`,
          telefone: `+5511${i.toString().padStart(8, '0')}`,
          pix_iban: `participante${i}@teste.com`
        });
      }

      const response = await request(app)
        .get('/api/participantes?page=2&limit=5')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body.participantes).toHaveLength(5);
      expect(response.body.pagination).toHaveProperty('page', 2);
      expect(response.body.pagination).toHaveProperty('limit', 5);
      expect(response.body.pagination).toHaveProperty('total', 15);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .get('/api/participantes');

      validateErrorResponse(response, 401);
    });
  });

  describe('GET /api/participantes/:id', () => {
    it('deve retornar detalhes do participante', async () => {
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .get(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('participante');
      expect(response.body.participante).toHaveProperty('id', participante.id);
      expect(response.body.participante).toHaveProperty('nome', participante.nome);
      expect(response.body.participante).toHaveProperty('telefone', participante.telefone);
      expect(response.body.participante).toHaveProperty('pix_iban', participante.pix_iban);
    });

    it('deve retornar erro para participante inexistente', async () => {
      const response = await request(app)
        .get('/api/participantes/999')
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
      expect(response.body.message).toBe('Participante não encontrado');
    });

    it('deve retornar erro para participante de outro gestor', async () => {
      const outroGestor = await createTestGestor({ email: 'outro@teste.com' });
      const participante = await createTestParticipante(outroGestor.id);

      const response = await request(app)
        .get(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .get('/api/participantes/1');

      validateErrorResponse(response, 401);
    });
  });

  describe('POST /api/participantes', () => {
    it('deve criar novo participante', async () => {
      const participanteData = {
        nome: 'Novo Participante',
        telefone: '+5511666666666',
        pix_iban: 'novo@teste.com'
      };

      const response = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send(participanteData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Participante criado com sucesso');
      expect(response.body).toHaveProperty('participante');
      expect(response.body.participante).toHaveProperty('nome', participanteData.nome);
      expect(response.body.participante).toHaveProperty('telefone', participanteData.telefone);
      expect(response.body.participante).toHaveProperty('pix_iban', participanteData.pix_iban);
      expect(response.body.participante).toHaveProperty('gestorId', gestor.id);
    });

    it('deve retornar erro com telefone duplicado', async () => {
      await createTestParticipante(gestor.id);

      const response = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Outro Participante',
          telefone: '+5511888888888',
          pix_iban: 'outro@teste.com'
        });

      validateErrorResponse(response, 409);
      expect(response.body.message).toBe('Já existe um participante com este telefone');
    });

    it('deve validar dados obrigatórios', async () => {
      const response = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Participante'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar formato do telefone', async () => {
      const response = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Participante',
          telefone: 'telefone-invalido',
          pix_iban: 'teste@teste.com'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar tamanho mínimo do nome', async () => {
      const response = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'A',
          telefone: '+5511888888888',
          pix_iban: 'teste@teste.com'
        });

      validateErrorResponse(response, 400);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .post('/api/participantes')
        .send({
          nome: 'Participante',
          telefone: '+5511888888888',
          pix_iban: 'teste@teste.com'
        });

      validateErrorResponse(response, 401);
    });
  });

  describe('PUT /api/participantes/:id', () => {
    it('deve atualizar participante', async () => {
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .put(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Nome Atualizado',
          telefone: '+5511777777777'
        });

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Participante atualizado com sucesso');
      expect(response.body.participante).toHaveProperty('nome', 'Nome Atualizado');
      expect(response.body.participante).toHaveProperty('telefone', '+5511777777777');
    });

    it('deve retornar erro para participante inexistente', async () => {
      const response = await request(app)
        .put('/api/participantes/999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Nome Atualizado'
        });

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro com telefone duplicado', async () => {
      const participante1 = await createTestParticipante(gestor.id);
      const participante2 = await createTestParticipante(gestor.id, {
        nome: 'Outro Participante',
        telefone: '+5511777777777',
        pix_iban: 'outro@teste.com'
      });

      const response = await request(app)
        .put(`/api/participantes/${participante1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          telefone: '+5511777777777'
        });

      validateErrorResponse(response, 409);
      expect(response.body.message).toBe('Já existe um participante com este telefone');
    });

    it('deve validar formato do telefone', async () => {
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .put(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          telefone: 'telefone-invalido'
        });

      validateErrorResponse(response, 400);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .put('/api/participantes/1')
        .send({
          nome: 'Nome Atualizado'
        });

      validateErrorResponse(response, 401);
    });
  });

  describe('DELETE /api/participantes/:id', () => {
    it('deve remover participante', async () => {
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .delete(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Participante removido com sucesso');

      // Verificar se o participante foi desativado
      const participanteRemovido = await Participante.findByPk(participante.id);
      expect(participanteRemovido.ativo).toBe(false);
    });

    it('deve retornar erro para participante inexistente', async () => {
      const response = await request(app)
        .delete('/api/participantes/999')
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .delete('/api/participantes/1');

      validateErrorResponse(response, 401);
    });
  });
});
