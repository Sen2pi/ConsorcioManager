const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } = require('./setup');
const { createTestGestor, createTestParticipante, createTestConsorcio, validateErrorResponse, validateSuccessResponse } = require('./helpers');
const { Consorcio, ConsorcioParticipante } = require('../models');

describe('Consorcios Routes', () => {
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

  describe('GET /api/consorcios', () => {
    it('deve listar consórcios do gestor', async () => {
      await createTestConsorcio(gestor.id);
      await createTestConsorcio(gestor.id, {
        nome: 'Outro Consórcio',
        montante_total: 20000.00,
        prazo_meses: 24
      });

      const response = await request(app)
        .get('/api/consorcios')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('consorcios');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.consorcios).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
    });

    it('deve filtrar consórcios por status', async () => {
      await createTestConsorcio(gestor.id, { status: 'ativo' });
      await createTestConsorcio(gestor.id, { status: 'fechado' });

      const response = await request(app)
        .get('/api/consorcios?status=ativo')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body.consorcios).toHaveLength(1);
      expect(response.body.consorcios[0].status).toBe('ativo');
    });

    it('deve filtrar consórcios por busca', async () => {
      await createTestConsorcio(gestor.id);
      await createTestConsorcio(gestor.id, {
        nome: 'Consórcio Especial',
        montante_total: 15000.00
      });

      const response = await request(app)
        .get('/api/consorcios?search=Especial')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body.consorcios).toHaveLength(1);
      expect(response.body.consorcios[0].nome).toBe('Consórcio Especial');
    });

    it('deve paginar resultados', async () => {
      // Criar 15 consórcios
      for (let i = 1; i <= 15; i++) {
        await createTestConsorcio(gestor.id, {
          nome: `Consórcio ${i}`,
          montante_total: 10000 * i
        });
      }

      const response = await request(app)
        .get('/api/consorcios?page=2&limit=5')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body.consorcios).toHaveLength(5);
      expect(response.body.pagination).toHaveProperty('page', 2);
      expect(response.body.pagination).toHaveProperty('limit', 5);
      expect(response.body.pagination).toHaveProperty('total', 15);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .get('/api/consorcios');

      validateErrorResponse(response, 401);
    });
  });

  describe('GET /api/consorcios/dashboard', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      await createTestConsorcio(gestor.id, { status: 'ativo' });
      await createTestConsorcio(gestor.id, { status: 'ativo' });
      await createTestConsorcio(gestor.id, { status: 'fechado' });
      await createTestParticipante(gestor.id);
      await createTestParticipante(gestor.id, {
        nome: 'Outro Participante',
        telefone: '+5511777777777',
        pix_iban: 'outro@teste.com'
      });

      const response = await request(app)
        .get('/api/consorcios/dashboard')
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('estatisticas');
      expect(response.body.estatisticas).toHaveProperty('consorciosAtivos', 2);
      expect(response.body.estatisticas).toHaveProperty('consorciosFechados', 1);
      expect(response.body.estatisticas).toHaveProperty('totalParticipantes', 2);
      expect(response.body).toHaveProperty('consorciosRecentes');
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .get('/api/consorcios/dashboard');

      validateErrorResponse(response, 401);
    });
  });

  describe('GET /api/consorcios/:id', () => {
    it('deve retornar detalhes do consórcio', async () => {
      const consorcio = await createTestConsorcio(gestor.id);

      const response = await request(app)
        .get(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('consorcio');
      expect(response.body.consorcio).toHaveProperty('id', consorcio.id);
      expect(response.body.consorcio).toHaveProperty('nome', consorcio.nome);
      expect(response.body.consorcio).toHaveProperty('montante_total', consorcio.montante_total);
      expect(response.body.consorcio).toHaveProperty('prazo_meses', consorcio.prazo_meses);
    });

    it('deve retornar erro para consórcio inexistente', async () => {
      const response = await request(app)
        .get('/api/consorcios/999')
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
      expect(response.body.message).toBe('Consórcio não encontrado');
    });

    it('deve retornar erro para consórcio de outro gestor', async () => {
      const outroGestor = await createTestGestor({ email: 'outro@teste.com' });
      const consorcio = await createTestConsorcio(outroGestor.id);

      const response = await request(app)
        .get(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .get('/api/consorcios/1');

      validateErrorResponse(response, 401);
    });
  });

  describe('POST /api/consorcios', () => {
    it('deve criar novo consórcio', async () => {
      const consorcioData = {
        nome: 'Novo Consórcio',
        montante_total: 25000.00,
        prazo_meses: 18,
        numero_cotas: 25,
        data_inicio: '2024-02-01',
        descricao: 'Consórcio para testes'
      };

      const response = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send(consorcioData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Consórcio criado com sucesso');
      expect(response.body).toHaveProperty('consorcio');
      expect(response.body.consorcio).toHaveProperty('nome', consorcioData.nome);
      expect(response.body.consorcio).toHaveProperty('montante_total', consorcioData.montante_total);
      expect(response.body.consorcio).toHaveProperty('gestorId', gestor.id);
    });

    it('deve validar dados obrigatórios', async () => {
      const response = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar montante positivo', async () => {
      const response = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio',
          montante_total: -1000,
          prazo_meses: 12,
          numero_cotas: 20,
          data_inicio: '2024-01-01'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar prazo mínimo', async () => {
      const response = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio',
          montante_total: 10000,
          prazo_meses: 0,
          numero_cotas: 20,
          data_inicio: '2024-01-01'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar prazo máximo', async () => {
      const response = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio',
          montante_total: 10000,
          prazo_meses: 121,
          numero_cotas: 20,
          data_inicio: '2024-01-01'
        });

      validateErrorResponse(response, 400);
    });

    it('deve validar número de cotas mínimo', async () => {
      const response = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio',
          montante_total: 10000,
          prazo_meses: 12,
          numero_cotas: 0,
          data_inicio: '2024-01-01'
        });

      validateErrorResponse(response, 400);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .post('/api/consorcios')
        .send({
          nome: 'Consórcio',
          montante_total: 10000,
          prazo_meses: 12,
          numero_cotas: 20,
          data_inicio: '2024-01-01'
        });

      validateErrorResponse(response, 401);
    });
  });

  describe('PUT /api/consorcios/:id', () => {
    it('deve atualizar consórcio', async () => {
      const consorcio = await createTestConsorcio(gestor.id);

      const response = await request(app)
        .put(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Nome Atualizado',
          status: 'fechado',
          data_fim: '2024-12-31'
        });

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Consórcio atualizado com sucesso');
      expect(response.body.consorcio).toHaveProperty('nome', 'Nome Atualizado');
      expect(response.body.consorcio).toHaveProperty('status', 'fechado');
    });

    it('deve retornar erro para consórcio inexistente', async () => {
      const response = await request(app)
        .put('/api/consorcios/999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Nome Atualizado'
        });

      validateErrorResponse(response, 404);
    });

    it('deve validar status válido', async () => {
      const consorcio = await createTestConsorcio(gestor.id);

      const response = await request(app)
        .put(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'status-invalido'
        });

      validateErrorResponse(response, 400);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .put('/api/consorcios/1')
        .send({
          nome: 'Nome Atualizado'
        });

      validateErrorResponse(response, 401);
    });
  });

  describe('DELETE /api/consorcios/:id', () => {
    it('deve remover consórcio', async () => {
      const consorcio = await createTestConsorcio(gestor.id);

      const response = await request(app)
        .delete(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Consórcio removido com sucesso');

      // Verificar se o consórcio foi removido
      const consorcioRemovido = await Consorcio.findByPk(consorcio.id);
      expect(consorcioRemovido).toBeNull();
    });

    it('deve retornar erro para consórcio inexistente', async () => {
      const response = await request(app)
        .delete('/api/consorcios/999')
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .delete('/api/consorcios/1');

      validateErrorResponse(response, 401);
    });
  });

  describe('POST /api/consorcios/:id/participantes', () => {
    it('deve adicionar participante ao consórcio', async () => {
      const consorcio = await createTestConsorcio(gestor.id);
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .post(`/api/consorcios/${consorcio.id}/participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: participante.id,
          numero_cotas: 1.5,
          montante_individual: 750.00
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Participante adicionado ao consórcio com sucesso');

      // Verificar se a associação foi criada
      const associacao = await ConsorcioParticipante.findOne({
        where: {
          consorcioId: consorcio.id,
          participanteId: participante.id
        }
      });
      expect(associacao).toBeTruthy();
      expect(associacao.numero_cotas).toBe(1.5);
      expect(associacao.montante_individual).toBe(750.00);
    });

    it('deve retornar erro para consórcio inexistente', async () => {
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .post('/api/consorcios/999/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: participante.id,
          numero_cotas: 1.0,
          montante_individual: 500.00
        });

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro para participante inexistente', async () => {
      const consorcio = await createTestConsorcio(gestor.id);

      const response = await request(app)
        .post(`/api/consorcios/${consorcio.id}/participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: 999,
          numero_cotas: 1.0,
          montante_individual: 500.00
        });

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro para participante já no consórcio', async () => {
      const consorcio = await createTestConsorcio(gestor.id);
      const participante = await createTestParticipante(gestor.id);

      // Adicionar participante pela primeira vez
      await request(app)
        .post(`/api/consorcios/${consorcio.id}/participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: participante.id,
          numero_cotas: 1.0,
          montante_individual: 500.00
        });

      // Tentar adicionar novamente
      const response = await request(app)
        .post(`/api/consorcios/${consorcio.id}/participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: participante.id,
          numero_cotas: 2.0,
          montante_individual: 1000.00
        });

      validateErrorResponse(response, 409);
      expect(response.body.message).toBe('Participante já está neste consórcio');
    });

    it('deve validar número de cotas', async () => {
      const consorcio = await createTestConsorcio(gestor.id);
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .post(`/api/consorcios/${consorcio.id}/participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: participante.id,
          numero_cotas: 0.3, // Inválido
          montante_individual: 500.00
        });

      validateErrorResponse(response, 400);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .post('/api/consorcios/1/participantes')
        .send({
          participanteId: 1,
          numero_cotas: 1.0,
          montante_individual: 500.00
        });

      validateErrorResponse(response, 401);
    });
  });

  describe('DELETE /api/consorcios/:id/participantes/:participanteId', () => {
    it('deve remover participante do consórcio', async () => {
      const consorcio = await createTestConsorcio(gestor.id);
      const participante = await createTestParticipante(gestor.id);

      // Adicionar participante
      await ConsorcioParticipante.create({
        consorcioId: consorcio.id,
        participanteId: participante.id,
        numero_cotas: 1.0,
        montante_individual: 500.00
      });

      const response = await request(app)
        .delete(`/api/consorcios/${consorcio.id}/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Participante removido do consórcio com sucesso');

      // Verificar se a associação foi desativada
      const associacao = await ConsorcioParticipante.findOne({
        where: {
          consorcioId: consorcio.id,
          participanteId: participante.id
        }
      });
      expect(associacao.ativo).toBe(false);
    });

    it('deve retornar erro para consórcio inexistente', async () => {
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .delete(`/api/consorcios/999/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
    });

    it('deve retornar erro para participante não no consórcio', async () => {
      const consorcio = await createTestConsorcio(gestor.id);
      const participante = await createTestParticipante(gestor.id);

      const response = await request(app)
        .delete(`/api/consorcios/${consorcio.id}/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      validateErrorResponse(response, 404);
      expect(response.body.message).toBe('Participante não encontrado neste consórcio');
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app)
        .delete('/api/consorcios/1/participantes/1');

      validateErrorResponse(response, 401);
    });
  });
});
