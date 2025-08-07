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
    const cotasPreenchidas = totalCotas; // Usar o total de cotas, não o número de participantes
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
      },
      include: [{ model: Participante, attributes: ['nome'] }],
      order: [['numero_cotas', 'DESC']] // Ordenar por número de cotas (maior primeiro)
    });

    if (participantes.length === 0) {
      return res.status(400).json({ 
        message: 'Todos os participantes já foram contemplados' 
      });
    }

    const contemplacoesGeradas = [];
    let mesAtual = 1;

    // Primeiro, contemplar participantes com 2 cotas (auto-contemplados)
    for (const participante of participantes) {
      if (parseFloat(participante.numero_cotas) === 2.0) {
        // Verificar se o mês já está ocupado
        while (await Contemplacao.findOne({
          where: { consorcioId: consorcio.id, mes_contemplacao: mesAtual }
        })) {
          mesAtual++;
        }

        if (mesAtual <= consorcio.prazo_meses) {
          const dataInicio = new Date(consorcio.data_inicio);
          const dataContemplacao = new Date(dataInicio);
          dataContemplacao.setMonth(dataInicio.getMonth() + mesAtual - 1);

          const contemplacao = await Contemplacao.create({
            consorcioId: consorcio.id,
            participanteId: participante.participanteId,
            mes_contemplacao: mesAtual,
            data_contemplacao: dataContemplacao,
            valor_contemplado: consorcio.montante_total,
            tipo_contemplacao: 'automatico'
          });

          await ConsorcioParticipante.update(
            { 
              contemplado: true, 
              mes_contemplacao: mesAtual,
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
          mesAtual++;
        }
      }
    }

    // Depois, agrupar participantes com 0.5 cotas (máximo 2 por contemplação)
    const participantesMeiaCota = participantes.filter(p => parseFloat(p.numero_cotas) === 0.5);
    const gruposMeiaCota = [];
    
    for (let i = 0; i < participantesMeiaCota.length; i += 2) {
      const grupo = participantesMeiaCota.slice(i, i + 2);
      if (grupo.length > 0) {
        gruposMeiaCota.push(grupo);
      }
    }

    // Contemplar grupos de 0.5 cotas
    for (const grupo of gruposMeiaCota) {
      // Verificar se o mês já está ocupado
      while (await Contemplacao.findOne({
        where: { consorcioId: consorcio.id, mes_contemplacao: mesAtual }
      })) {
        mesAtual++;
      }

      if (mesAtual <= consorcio.prazo_meses) {
        const dataInicio = new Date(consorcio.data_inicio);
        const dataContemplacao = new Date(dataInicio);
        dataContemplacao.setMonth(dataInicio.getMonth() + mesAtual - 1);

        // Criar contemplação para o primeiro participante do grupo
        const contemplacao = await Contemplacao.create({
          consorcioId: consorcio.id,
          participanteId: grupo[0].participanteId,
          mes_contemplacao: mesAtual,
          data_contemplacao: dataContemplacao,
          valor_contemplado: consorcio.montante_total,
          tipo_contemplacao: 'automatico'
        });

        // Atualizar todos os participantes do grupo
        for (const participante of grupo) {
          await ConsorcioParticipante.update(
            { 
              contemplado: true, 
              mes_contemplacao: mesAtual,
              status_pagamento: 'contemplado'
            },
            {
              where: {
                consorcioId: consorcio.id,
                participanteId: participante.participanteId
              }
            }
          );
        }

        contemplacoesGeradas.push(contemplacao);
        mesAtual++;
      }
    }

    // Por fim, contemplar participantes com 1 cota (contemplação normal)
    const participantesUmaCota = participantes.filter(p => parseFloat(p.numero_cotas) === 1.0);
    
    for (const participante of participantesUmaCota) {
      // Verificar se o mês já está ocupado
      while (await Contemplacao.findOne({
        where: { consorcioId: consorcio.id, mes_contemplacao: mesAtual }
      })) {
        mesAtual++;
      }

      if (mesAtual <= consorcio.prazo_meses) {
        const dataInicio = new Date(consorcio.data_inicio);
        const dataContemplacao = new Date(dataInicio);
        dataContemplacao.setMonth(dataInicio.getMonth() + mesAtual - 1);

        const contemplacao = await Contemplacao.create({
          consorcioId: consorcio.id,
          participanteId: participante.participanteId,
          mes_contemplacao: mesAtual,
          data_contemplacao: dataContemplacao,
          valor_contemplado: consorcio.montante_total,
          tipo_contemplacao: 'automatico'
        });

        await ConsorcioParticipante.update(
          { 
            contemplado: true, 
            mes_contemplacao: mesAtual,
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
        mesAtual++;
      }
    }

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