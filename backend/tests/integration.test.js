const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } = require('./setup');
const { createTestGestor, createTestParticipante, createTestConsorcio, validateErrorResponse, validateSuccessResponse } = require('./helpers');
const { Gestor, Participante, Consorcio, ConsorcioParticipante } = require('../models');

describe('Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('Fluxo Completo de Gestão de Consórcios', () => {
    it('deve permitir fluxo completo: registro, login, criação de participantes e consórcios', async () => {
      // 1. Registrar novo gestor
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Gestor Completo',
          email: 'gestor@completo.com',
          senha: 'senha123456',
          telefone: '+5511999999999'
        });

      expect(registerResponse.status).toBe(201);
      const { token, gestor } = registerResponse.body;

      // 2. Fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gestor@completo.com',
          senha: 'senha123456'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');

      // 3. Criar participantes
      const participante1Response = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'João Silva',
          telefone: '+5511888888888',
          pix_iban: 'joao@teste.com'
        });

      expect(participante1Response.status).toBe(201);
      const participante1 = participante1Response.body.participante;

      const participante2Response = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Maria Santos',
          telefone: '+5511777777777',
          pix_iban: 'maria@teste.com'
        });

      expect(participante2Response.status).toBe(201);
      const participante2 = participante2Response.body.participante;

      // 4. Criar consórcio
      const consorcioResponse = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio Completo',
          montante_total: 50000.00,
          prazo_meses: 24,
          numero_cotas: 50,
          data_inicio: '2024-01-01',
          descricao: 'Consórcio para teste de integração'
        });

      expect(consorcioResponse.status).toBe(201);
      const consorcio = consorcioResponse.body.consorcio;

      // 5. Adicionar participantes ao consórcio
      const addParticipante1Response = await request(app)
        .post(`/api/consorcios/${consorcio.id}/participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: participante1.id,
          numero_cotas: 2.0,
          montante_individual: 2000.00
        });

      expect(addParticipante1Response.status).toBe(201);

      const addParticipante2Response = await request(app)
        .post(`/api/consorcios/${consorcio.id}/participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participanteId: participante2.id,
          numero_cotas: 1.5,
          montante_individual: 1500.00
        });

      expect(addParticipante2Response.status).toBe(201);

      // 6. Verificar detalhes do consórcio
      const consorcioDetalhesResponse = await request(app)
        .get(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(consorcioDetalhesResponse.status).toBe(200);
      expect(consorcioDetalhesResponse.body.consorcio.participantes).toHaveLength(2);

      // 7. Verificar dashboard
      const dashboardResponse = await request(app)
        .get('/api/consorcios/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.estatisticas.consorciosAtivos).toBe(1);
      expect(dashboardResponse.body.estatisticas.totalParticipantes).toBe(2);
    });

    it('deve manter isolamento entre gestores', async () => {
      // Criar dois gestores
      const gestor1 = await createTestGestor({ email: 'gestor1@teste.com' });
      const gestor2 = await createTestGestor({ email: 'gestor2@teste.com' });

      const token1 = jwt.sign(
        { gestorId: gestor1.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const token2 = jwt.sign(
        { gestorId: gestor2.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Criar participantes para cada gestor
      const participante1 = await createTestParticipante(gestor1.id);
      const participante2 = await createTestParticipante(gestor2.id);

      // Criar consórcios para cada gestor
      const consorcio1 = await createTestConsorcio(gestor1.id);
      const consorcio2 = await createTestConsorcio(gestor2.id);

      // Gestor 1 não deve ver dados do gestor 2
      const participantesGestor1 = await request(app)
        .get('/api/participantes')
        .set('Authorization', `Bearer ${token1}`);

      expect(participantesGestor1.body.participantes).toHaveLength(1);
      expect(participantesGestor1.body.participantes[0].id).toBe(participante1.id);

      const consorciosGestor1 = await request(app)
        .get('/api/consorcios')
        .set('Authorization', `Bearer ${token1}`);

      expect(consorciosGestor1.body.consorcios).toHaveLength(1);
      expect(consorciosGestor1.body.consorcios[0].id).toBe(consorcio1.id);

      // Gestor 2 não deve ver dados do gestor 1
      const participantesGestor2 = await request(app)
        .get('/api/participantes')
        .set('Authorization', `Bearer ${token2}`);

      expect(participantesGestor2.body.participantes).toHaveLength(1);
      expect(participantesGestor2.body.participantes[0].id).toBe(participante2.id);

      const consorciosGestor2 = await request(app)
        .get('/api/consorcios')
        .set('Authorization', `Bearer ${token2}`);

      expect(consorciosGestor2.body.consorcios).toHaveLength(1);
      expect(consorciosGestor2.body.consorcios[0].id).toBe(consorcio2.id);
    });

    it('deve permitir atualização e remoção de dados', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Criar participante
      const participanteResponse = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Participante Teste',
          telefone: '+5511888888888',
          pix_iban: 'teste@teste.com'
        });

      const participante = participanteResponse.body.participante;

      // Atualizar participante
      const updateResponse = await request(app)
        .put(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Participante Atualizado',
          telefone: '+5511777777777'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.participante.nome).toBe('Participante Atualizado');

      // Criar consórcio
      const consorcioResponse = await request(app)
        .post('/api/consorcios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio Teste',
          montante_total: 10000.00,
          prazo_meses: 12,
          numero_cotas: 20,
          data_inicio: '2024-01-01'
        });

      const consorcio = consorcioResponse.body.consorcio;

      // Atualizar consórcio
      const updateConsorcioResponse = await request(app)
        .put(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Consórcio Atualizado',
          status: 'fechado'
        });

      expect(updateConsorcioResponse.status).toBe(200);
      expect(updateConsorcioResponse.body.consorcio.nome).toBe('Consórcio Atualizado');
      expect(updateConsorcioResponse.body.consorcio.status).toBe('fechado');

      // Remover participante
      const deleteParticipanteResponse = await request(app)
        .delete(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteParticipanteResponse.status).toBe(200);

      // Verificar que participante foi desativado
      const participanteRemovido = await Participante.findByPk(participante.id);
      expect(participanteRemovido.ativo).toBe(false);

      // Remover consórcio
      const deleteConsorcioResponse = await request(app)
        .delete(`/api/consorcios/${consorcio.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteConsorcioResponse.status).toBe(200);

      // Verificar que consórcio foi removido
      const consorcioRemovido = await Consorcio.findByPk(consorcio.id);
      expect(consorcioRemovido).toBeNull();
    });

    it('deve lidar com cenários de erro complexos', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Tentar acessar recursos sem autenticação
      const responseSemAuth = await request(app)
        .get('/api/participantes');

      expect(responseSemAuth.status).toBe(401);

      // Tentar acessar recursos com token inválido
      const responseTokenInvalido = await request(app)
        .get('/api/consorcios')
        .set('Authorization', 'Bearer token-invalido');

      expect(responseTokenInvalido.status).toBe(403);

      // Tentar acessar recursos de outro gestor
      const outroGestor = await createTestGestor({ email: 'outro@teste.com' });
      const participante = await createTestParticipante(outroGestor.id);

      const responseOutroGestor = await request(app)
        .get(`/api/participantes/${participante.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(responseOutroGestor.status).toBe(404);

      // Tentar criar dados com validações inválidas
      const responseDadosInvalidos = await request(app)
        .post('/api/participantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'A', // Nome muito curto
          telefone: 'telefone-invalido',
          pix_iban: '' // PIX vazio
        });

      expect(responseDadosInvalidos.status).toBe(400);
    });

    it('deve testar paginação e filtros', async () => {
      const gestor = await createTestGestor();
      const token = jwt.sign(
        { gestorId: gestor.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Criar múltiplos participantes
      const participantes = [];
      for (let i = 1; i <= 25; i++) {
        const participante = await createTestParticipante(gestor.id, {
          nome: `Participante ${i}`,
          telefone: `+5511${i.toString().padStart(8, '0')}`,
          pix_iban: `participante${i}@teste.com`
        });
        participantes.push(participante);
      }

      // Testar paginação
      const responsePagina1 = await request(app)
        .get('/api/participantes?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(responsePagina1.body.participantes).toHaveLength(10);
      expect(responsePagina1.body.pagination.page).toBe(1);
      expect(responsePagina1.body.pagination.total).toBe(25);

      const responsePagina2 = await request(app)
        .get('/api/participantes?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(responsePagina2.body.participantes).toHaveLength(10);
      expect(responsePagina2.body.pagination.page).toBe(2);

      const responsePagina3 = await request(app)
        .get('/api/participantes?page=3&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(responsePagina3.body.participantes).toHaveLength(5);

      // Testar busca
      const responseBusca = await request(app)
        .get('/api/participantes?search=Participante 1')
        .set('Authorization', `Bearer ${token}`);

      expect(responseBusca.body.participantes.length).toBeGreaterThan(0);
      expect(responseBusca.body.participantes[0].nome).toContain('Participante 1');
    });
  });
});
