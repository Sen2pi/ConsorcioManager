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

    const totalCotas = participantes.reduce((sum, p) => sum + parseFloat(p.numero_cotas), 0);
    const cotasPreenchidas = participantes.length;
    const cotasDisponiveis = consorcio.numero_cotas - cotasPreenchidas;

    // Obter resumo de pagamentos
    const resumoPagamentos = await PagamentoService.getResumoConsorcio(consorcio.id);

    res.json({
      consorcio,
      contemplacoes,
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
      participanteId: Joi.number().integer().required(),
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

    const { participanteId, mes_contemplacao } = req.body;

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

    // Verificar se participante existe no consórcio
    const participante = await ConsorcioParticipante.findOne({
      where: {
        consorcioId: consorcio.id,
        participanteId,
        ativo: true
      }
    });

    if (!participante) {
      return res.status(404).json({ 
        message: 'Participante não encontrado neste consórcio' 
      });
    }

    const dataInicio = new Date(consorcio.data_inicio);
    const dataContemplacao = new Date(dataInicio);
    dataContemplacao.setMonth(dataInicio.getMonth() + mes_contemplacao - 1);

    const contemplacao = await Contemplacao.create({
      consorcioId: consorcio.id,
      participanteId,
      mes_contemplacao,
      data_contemplacao: dataContemplacao,
      valor_contemplado: consorcio.montante_total,
      tipo_contemplacao: req.body.tipo_contemplacao,
      valor_lance: req.body.valor_lance,
      observacoes: req.body.observacoes
    });

    // Atualizar participante como contemplado
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

    res.status(201).json({
      message: 'Participante contemplado com sucesso',
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

    // Atualizar participante
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

    const participantes = await ConsorcioParticipante.findAll({
      where: {
        consorcioId: consorcio.id,
        ativo: true,
        contemplado: false
      }
    });

    if (participantes.length === 0) {
      return res.status(400).json({ 
        message: 'Todos os participantes já foram contemplados' 
      });
    }

    // Embaralhar participantes
    const participantesEmbaralhados = participantes.sort(() => Math.random() - 0.5);
    const contemplacoesGeradas = [];

    for (let i = 0; i < participantesEmbaralhados.length; i++) {
      const participante = participantesEmbaralhados[i];
      let mes = i + 1;

      // Verificar se o mês já está ocupado
      while (await Contemplacao.findOne({
        where: { consorcioId: consorcio.id, mes_contemplacao: mes }
      })) {
        mes++;
      }

      if (mes <= consorcio.prazo_meses) {
        const dataInicio = new Date(consorcio.data_inicio);
        const dataContemplacao = new Date(dataInicio);
        dataContemplacao.setMonth(dataInicio.getMonth() + mes - 1);

        const contemplacao = await Contemplacao.create({
          consorcioId: consorcio.id,
          participanteId: participante.participanteId,
          mes_contemplacao: mes,
          data_contemplacao: dataContemplacao,
          valor_contemplado: consorcio.montante_total,
          tipo_contemplacao: 'automatico'
        });

        await ConsorcioParticipante.update(
          { 
            contemplado: true, 
            mes_contemplacao: mes,
            status_pagamento: 'contemplado'
          },
          {
            where: {
              consorcioId: consorcio.id,
              participanteId: participante.participanteId
            }
          }
        );

        contemplacoesGeradas.push(contemplacao);
      }
    }

    res.json({
      message: `${contemplacoesGeradas.length} participantes contemplados automaticamente`,
      contemplacoes: contemplacoesGeradas
    });

  } catch (error) {
    console.error('Erro na auto-contemplação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;