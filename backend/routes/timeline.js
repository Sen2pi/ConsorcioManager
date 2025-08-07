const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { 
  Consorcio, 
  ConsorcioParticipante, 
  Participante, 
  Pagamento, 
  Contemplacao 
} = require('../models');
const authenticateToken = require('../middleware/auth');
const PagamentoService = require('../services/pagamentoService');

const router = express.Router();

// Obter timeline completa do consórcio
router.get('/consorcios/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const consorcio = await Consorcio.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    // Gerar pagamentos se não existirem
    await PagamentoService.gerarPagamentosConsorcio(consorcio.id);

    // Obter contemplações
    const contemplacoes = await Contemplacao.findAll({
      where: { consorcioId: consorcio.id },
      include: [{ model: Participante, attributes: ['nome'] }],
      order: [['mes_contemplacao', 'ASC']]
    });

    // Obter resumo de cotas
    const participantes = await ConsorcioParticipante.findAll({
      where: { consorcioId: consorcio.id, ativo: true },
      include: [{ model: Participante, attributes: ['nome'] }]
    });

    // Agrupar participantes contemplados por mês
    const participantesContemplados = participantes.filter(p => p.contemplado);
    const contemplacoesPorMes = {};

    for (const participante of participantesContemplados) {
      const mes = participante.mes_contemplacao;
      if (!contemplacoesPorMes[mes]) {
        contemplacoesPorMes[mes] = [];
      }
      contemplacoesPorMes[mes].push({
        id: participante.participanteId,
        nome: participante.Participante.nome,
        cotas: participante.numero_cotas,
        contemplacaoId: contemplacoes.find(c => c.participanteId === participante.participanteId && c.mes_contemplacao === mes)?.id
      });
    }

    const totalCotas = participantes.reduce((sum, p) => sum + parseFloat(p.numero_cotas), 0);
    const cotasPreenchidas = totalCotas; // Usar o total de cotas, não o número de participantes
    const cotasDisponiveis = consorcio.numero_cotas - cotasPreenchidas;

    // Obter resumo de pagamentos
    const resumoPagamentos = await PagamentoService.getResumoConsorcio(consorcio.id);

    res.json({
      consorcio,
      contemplacoes,
      contemplacoesPorMes,
      resumo: {
        totalCotas,
        cotasPreenchidas,
        cotasDisponiveis,
        participantes: participantes.length,
        ...resumoPagamentos
      },
      participantes
    });

  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter pagamentos por mês
router.get('/consorcios/:id/pagamentos/:mes', authenticateToken, async (req, res) => {
  try {
    const { mes } = req.params;
    
    const consorcio = await Consorcio.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    const pagamentos = await Pagamento.findAll({
      where: {
        consorcioId: consorcio.id,
        mes_referencia: mes
      },
      include: [
        {
          model: Participante,
          attributes: ['id', 'nome']
        }
      ],
      order: [['data_vencimento', 'ASC']]
    });

    res.json({ pagamentos });

  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Marcar pagamento
router.put('/pagamentos/:id/pagar', authenticateToken, async (req, res) => {
  try {
    const schema = Joi.object({
      valor_pago: Joi.number().positive().required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const pagamento = await PagamentoService.marcarPagamento(
      req.params.id, 
      req.body.valor_pago
    );

    res.json({ 
      message: 'Pagamento registrado com sucesso',
      pagamento 
    });

  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ message: error.message });
  }
});

// Contemplar participante
router.post('/consorcios/:id/contemplar', authenticateToken, async (req, res) => {
  try {
    const schema = Joi.object({
      participanteIds: Joi.array().items(Joi.number().integer()).min(1).max(2).required(),
      mes_contemplacao: Joi.number().integer().min(1).max(120).required(),
      tipo_contemplacao: Joi.string().valid('sorteio', 'lance', 'automatico').default('automatico'),
      valor_lance: Joi.number().positive().optional(),
      observacoes: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const consorcio = await Consorcio.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    const { participanteIds, mes_contemplacao } = req.body;

    // Verificar se o mês já foi contemplado
    const contemplacaoExistente = await Contemplacao.findOne({
      where: {
        consorcioId: consorcio.id,
        mes_contemplacao
      }
    });

    if (contemplacaoExistente) {
      return res.status(409).json({ 
        message: 'Mês já contemplado' 
      });
    }

    // Verificar se todos os participantes existem no consórcio
    const participantes = await ConsorcioParticipante.findAll({
      where: {
        consorcioId: consorcio.id,
        participanteId: participanteIds,
        ativo: true
      }
    });

    if (participantes.length !== participanteIds.length) {
      return res.status(404).json({ 
        message: 'Um ou mais participantes não encontrados neste consórcio' 
      });
    }

    // Verificar se algum participante já foi contemplado
    const participantesContemplados = participantes.filter(p => p.contemplado);
    if (participantesContemplados.length > 0) {
      return res.status(409).json({ 
        message: 'Um ou mais participantes já foram contemplados' 
      });
    }

    // Calcular total de cotas dos participantes
    const totalCotas = participantes.reduce((sum, p) => sum + parseFloat(p.numero_cotas), 0);
    
    // Verificar se o total de cotas é válido (deve ser 1.0 para contemplação)
    if (Math.abs(totalCotas - 1.0) > 0.01) {
      return res.status(400).json({ 
        message: `Total de cotas deve ser 1.0, mas é ${totalCotas}` 
      });
    }

    const dataInicio = new Date(consorcio.data_inicio);
    const dataContemplacao = new Date(dataInicio);
    dataContemplacao.setMonth(dataInicio.getMonth() + mes_contemplacao - 1);

    // Criar contemplação para o primeiro participante
    const contemplacao = await Contemplacao.create({
      consorcioId: consorcio.id,
      participanteId: participanteIds[0], // Usar o primeiro participante como principal
      mes_contemplacao,
      data_contemplacao: dataContemplacao,
      valor_contemplado: consorcio.montante_total,
      tipo_contemplacao: req.body.tipo_contemplacao,
      valor_lance: req.body.valor_lance,
      observacoes: req.body.observacoes
    });

    // Atualizar todos os participantes como contemplados
    for (const participanteId of participanteIds) {
      await ConsorcioParticipante.update(
        { 
          contemplado: true, 
          mes_contemplacao,
          status_pagamento: 'contemplado'
        },
        {
          where: {
            consorcioId: consorcio.id,
            participanteId
          }
        }
      );
    }

    res.json({
      message: 'Contemplação criada com sucesso',
      contemplacao
    });

  } catch (error) {
    console.error('Erro ao contemplar participante:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Editar contemplação
router.put('/contemplacoes/:id', authenticateToken, async (req, res) => {
  try {
    const schema = Joi.object({
      participanteId: Joi.number().integer().required(),
      mes_contemplacao: Joi.number().integer().min(1).max(120).required(),
      tipo_contemplacao: Joi.string().valid('sorteio', 'lance', 'automatico').optional(),
      valor_lance: Joi.number().positive().optional(),
      observacoes: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const contemplacao = await Contemplacao.findByPk(req.params.id);
    if (!contemplacao) {
      return res.status(404).json({ message: 'Contemplação não encontrada' });
    }

    // Verificar se o consórcio pertence ao gestor
    const consorcio = await Consorcio.findOne({
      where: {
        id: contemplacao.consorcioId,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    const { participanteId, mes_contemplacao } = req.body;

    // Verificar se o novo mês já está ocupado (se mudou)
    if (mes_contemplacao !== contemplacao.mes_contemplacao) {
      const contemplacaoExistente = await Contemplacao.findOne({
        where: {
          consorcioId: consorcio.id,
          mes_contemplacao,
          id: { [Op.ne]: contemplacao.id }
        }
      });

      if (contemplacaoExistente) {
        return res.status(409).json({ message: 'Mês já contemplado por outro participante' });
      }
    }

    // Atualizar participante anterior
    await ConsorcioParticipante.update(
      { 
        contemplado: false, 
        mes_contemplacao: null,
        status_pagamento: 'em_dia'
      },
      {
        where: {
          consorcioId: consorcio.id,
          participanteId: contemplacao.participanteId
        }
      }
    );

    // Atualizar contemplação
    const dataInicio = new Date(consorcio.data_inicio);
    const dataContemplacao = new Date(dataInicio);
    dataContemplacao.setMonth(dataInicio.getMonth() + mes_contemplacao - 1);

    await contemplacao.update({
      participanteId,
      mes_contemplacao,
      data_contemplacao: dataContemplacao,
      tipo_contemplacao: req.body.tipo_contemplacao || contemplacao.tipo_contemplacao,
      valor_lance: req.body.valor_lance || contemplacao.valor_lance,
      observacoes: req.body.observacoes || contemplacao.observacoes
    });

    // Atualizar novo participante
    await ConsorcioParticipante.update(
      { 
        contemplado: true, 
        mes_contemplacao,
        status_pagamento: 'contemplado'
      },
      {
        where: {
          consorcioId: consorcio.id,
          participanteId
        }
      }
    );

    res.json({
      message: 'Contemplação atualizada com sucesso',
      contemplacao
    });

  } catch (error) {
    console.error('Erro ao editar contemplação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Remover contemplação
router.delete('/contemplacoes/:id', authenticateToken, async (req, res) => {
  try {
    const contemplacao = await Contemplacao.findByPk(req.params.id);

    if (!contemplacao) {
      return res.status(404).json({ message: 'Contemplação não encontrada' });
    }

    // Verificar se o consórcio pertence ao gestor
    const consorcio = await Consorcio.findOne({
      where: {
        id: contemplacao.consorcioId,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    // Encontrar todos os participantes contemplados no mesmo mês
    const participantesContemplados = await ConsorcioParticipante.findAll({
      where: {
        consorcioId: consorcio.id,
        mes_contemplacao: contemplacao.mes_contemplacao,
        contemplado: true
      }
    });

    // Atualizar todos os participantes contemplados no mesmo mês
    for (const participante of participantesContemplados) {
      await ConsorcioParticipante.update(
        { 
          contemplado: false, 
          mes_contemplacao: null,
          status_pagamento: 'em_dia'
        },
        {
          where: {
            consorcioId: consorcio.id,
            participanteId: participante.participanteId
          }
        }
      );
    }

    // Remover contemplação
    await contemplacao.destroy();

    res.json({ message: 'Contemplação removida com sucesso' });

  } catch (error) {
    console.error('Erro ao remover contemplação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Auto-contemplar todos os participantes
router.post('/consorcios/:id/auto-contemplar', authenticateToken, async (req, res) => {
  try {
    const consorcio = await Consorcio.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    // Buscar TODOS os participantes ativos (incluindo já contemplados para debug)
    const todosParticipantes = await ConsorcioParticipante.findAll({
      where: {
        consorcioId: consorcio.id,
        ativo: true
      },
      include: [{ model: Participante, attributes: ['nome'] }]
    });

    console.log('Todos os participantes:', todosParticipantes.map(p => ({
      nome: p.Participante.nome,
      cotas: p.numero_cotas,
      contemplado: p.contemplado,
      mes: p.mes_contemplacao
    })));

    // Filtrar apenas não contemplados
    const participantes = todosParticipantes.filter(p => !p.contemplado);

    console.log('Participantes não contemplados:', participantes.map(p => ({
      nome: p.Participante.nome,
      cotas: p.numero_cotas
    })));

    if (participantes.length === 0) {
      return res.status(400).json({ 
        message: 'Todos os participantes já foram contemplados' 
      });
    }

    // Calcular total de cotas disponíveis
    const totalCotas = participantes.reduce((sum, p) => sum + parseFloat(p.numero_cotas), 0);
    
    console.log('Total de cotas disponíveis:', totalCotas);
    console.log('Prazo do consórcio:', consorcio.prazo_meses);
    
    if (totalCotas > consorcio.prazo_meses) {
      return res.status(400).json({ 
        message: `Total de cotas (${totalCotas}) excede o prazo do consórcio (${consorcio.prazo_meses} meses)` 
      });
    }

    // Separar participantes por tipo de cota
    const participantesCotasInteiras = [];
    const participantesCotasFracionarias = [];

    for (const participante of participantes) {
      const numeroCotas = parseFloat(participante.numero_cotas);
      console.log(`Participante ${participante.Participante.nome}: ${numeroCotas} cotas`);
      
      if (numeroCotas >= 1.0) {
        // Participantes com 1 ou mais cotas
        const cotasInteiras = Math.floor(numeroCotas);
        for (let i = 0; i < cotasInteiras; i++) {
          participantesCotasInteiras.push({
            participante: participante,
            cotas: 1.0
          });
        }
        
        // Se há fração, adicionar como fracionária
        const fracao = numeroCotas - cotasInteiras;
        if (fracao > 0) {
          participantesCotasFracionarias.push({
            participante: participante,
            cotas: fracao
          });
        }
      } else {
        // Participantes com menos de 1 cota (ex: 0.5)
        participantesCotasFracionarias.push({
          participante: participante,
          cotas: numeroCotas
        });
      }
    }

    console.log('Participantes com cotas inteiras:', participantesCotasInteiras.map(p => ({
      nome: p.participante.Participante.nome,
      cotas: p.cotas
    })));

    console.log('Participantes com cotas fracionárias:', participantesCotasFracionarias.map(p => ({
      nome: p.participante.Participante.nome,
      cotas: p.cotas
    })));

    // Embaralhar listas
    const cotasInteirasEmbaralhadas = participantesCotasInteiras.sort(() => Math.random() - 0.5);
    const cotasFracionariasEmbaralhadas = participantesCotasFracionarias.sort(() => Math.random() - 0.5);

    // Criar lista de meses disponíveis
    const mesesDisponiveis = Array.from({ length: consorcio.prazo_meses }, (_, i) => i + 1);
    const mesesEmbaralhados = mesesDisponiveis.sort(() => Math.random() - 0.5);

    console.log('Meses embaralhados:', mesesEmbaralhados);

    const contemplacoesGeradas = [];
    let mesIndex = 0;

    // Primeiro, contemplar participantes com cotas inteiras
    for (const participanteCota of cotasInteirasEmbaralhadas) {
      if (mesIndex >= mesesEmbaralhados.length) break;

      const mesContemplacao = mesesEmbaralhados[mesIndex];
      console.log(`Contemplando ${participanteCota.participante.Participante.nome} (${participanteCota.cotas} cotas) no mês ${mesContemplacao}`);

      const dataInicio = new Date(consorcio.data_inicio);
      const dataContemplacao = new Date(dataInicio);
      dataContemplacao.setMonth(dataInicio.getMonth() + mesContemplacao - 1);

      const contemplacao = await Contemplacao.create({
        consorcioId: consorcio.id,
        participanteId: participanteCota.participante.participanteId,
        mes_contemplacao: mesContemplacao,
        data_contemplacao: dataContemplacao,
        valor_contemplado: consorcio.montante_total,
        tipo_contemplacao: 'automatico'
      });

      await ConsorcioParticipante.update(
        { 
          contemplado: true, 
          mes_contemplacao: mesContemplacao,
          status_pagamento: 'contemplado'
        },
        {
          where: {
            consorcioId: consorcio.id,
            participanteId: participanteCota.participante.participanteId
          }
        }
      );

      contemplacoesGeradas.push(contemplacao);
      mesIndex++;
    }

    // Depois, agrupar participantes com cotas fracionárias
    let grupoAtual = [];
    let cotasAcumuladas = 0;

    for (const participanteCota of cotasFracionariasEmbaralhadas) {
      if (cotasAcumuladas + participanteCota.cotas <= 1.0 && grupoAtual.length < 2) {
        // Adicionar ao grupo atual
        grupoAtual.push(participanteCota);
        cotasAcumuladas += participanteCota.cotas;
      } else {
        // Grupo está completo ou não cabe mais, salvar e começar novo
        if (grupoAtual.length > 0) {
          if (mesIndex >= mesesEmbaralhados.length) break;

          const mesContemplacao = mesesEmbaralhados[mesIndex];
          console.log(`Contemplando grupo no mês ${mesContemplacao}:`, grupoAtual.map(p => p.participante.Participante.nome));

          const dataInicio = new Date(consorcio.data_inicio);
          const dataContemplacao = new Date(dataInicio);
          dataContemplacao.setMonth(dataInicio.getMonth() + mesContemplacao - 1);

          // Criar contemplação para o primeiro participante do grupo
          const contemplacao = await Contemplacao.create({
            consorcioId: consorcio.id,
            participanteId: grupoAtual[0].participante.participanteId,
            mes_contemplacao: mesContemplacao,
            data_contemplacao: dataContemplacao,
            valor_contemplado: consorcio.montante_total,
            tipo_contemplacao: 'automatico'
          });

          // Atualizar todos os participantes do grupo
          for (const participante of grupoAtual) {
            await ConsorcioParticipante.update(
              { 
                contemplado: true, 
                mes_contemplacao: mesContemplacao,
                status_pagamento: 'contemplado'
              },
              {
                where: {
                  consorcioId: consorcio.id,
                  participanteId: participante.participante.participanteId
                }
              }
            );
          }

          contemplacoesGeradas.push(contemplacao);
          mesIndex++;
        }

        // Começar novo grupo
        grupoAtual = [participanteCota];
        cotasAcumuladas = participanteCota.cotas;
      }
    }

    // Processar último grupo se não estiver vazio
    if (grupoAtual.length > 0 && mesIndex < mesesEmbaralhados.length) {
      const mesContemplacao = mesesEmbaralhados[mesIndex];
      console.log(`Contemplando último grupo no mês ${mesContemplacao}:`, grupoAtual.map(p => p.participante.Participante.nome));

      const dataInicio = new Date(consorcio.data_inicio);
      const dataContemplacao = new Date(dataInicio);
      dataContemplacao.setMonth(dataInicio.getMonth() + mesContemplacao - 1);

      const contemplacao = await Contemplacao.create({
        consorcioId: consorcio.id,
        participanteId: grupoAtual[0].participante.participanteId,
        mes_contemplacao: mesContemplacao,
        data_contemplacao: dataContemplacao,
        valor_contemplado: consorcio.montante_total,
        tipo_contemplacao: 'automatico'
      });

      for (const participante of grupoAtual) {
        await ConsorcioParticipante.update(
          { 
            contemplado: true, 
            mes_contemplacao: mesContemplacao,
            status_pagamento: 'contemplado'
          },
          {
            where: {
              consorcioId: consorcio.id,
              participanteId: participante.participante.participanteId
            }
          }
        );
      }

      contemplacoesGeradas.push(contemplacao);
    }

    console.log('Contemplações geradas:', contemplacoesGeradas.length);

    res.json({
      message: `${contemplacoesGeradas.length} contemplações geradas automaticamente`,
      contemplacoes: contemplacoesGeradas
    });

  } catch (error) {
    console.error('Erro na auto-contemplação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;