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

    // Agrupar contemplações por mês (baseado nas contemplações, não nos participantes)
    const contemplacoesPorMes = {};

    for (const contemplacao of contemplacoes) {
      const mes = contemplacao.mes_contemplacao;
      if (!contemplacoesPorMes[mes]) {
        contemplacoesPorMes[mes] = [];
      }
      
      // Encontrar dados do participante
      const participante = participantes.find(p => p.participanteId === contemplacao.participanteId);
      if (participante) {
        contemplacoesPorMes[mes].push({
          id: contemplacao.participanteId,
          nome: contemplacao.Participante.nome,
          cotas: participante.numero_cotas,
          contemplacaoId: contemplacao.id
        });
      }
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

    // Verificar quantas contemplações já existem neste mês
    const contemplacoesExistentes = await Contemplacao.findAll({
      where: {
        consorcioId: consorcio.id,
        mes_contemplacao
      }
    });

    // Calcular cotas já contempladas neste mês
    let cotasJaContempladas = 0;
    for (const contemplacao of contemplacoesExistentes) {
      const participanteContemplado = await ConsorcioParticipante.findOne({
        where: {
          consorcioId: consorcio.id,
          participanteId: contemplacao.participanteId
        }
      });
      if (participanteContemplado) {
        cotasJaContempladas += parseFloat(participanteContemplado.numero_cotas);
      }
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
    
    // Verificar se o total de cotas junto com as já contempladas não excede 1.0
    const totalCotasComContempladas = cotasJaContempladas + totalCotas;
    if (totalCotasComContempladas > 1.0 + 0.01) {
      return res.status(400).json({ 
        message: `Total de cotas (${totalCotasComContempladas.toFixed(2)}) excederia 1.0 para este mês. Cotas já contempladas: ${cotasJaContempladas.toFixed(2)}` 
      });
    }

    const dataInicio = new Date(consorcio.data_inicio);
    const dataContemplacao = new Date(dataInicio);
    dataContemplacao.setMonth(dataInicio.getMonth() + mes_contemplacao - 1);

    // Criar contemplação para cada participante
    const contemplacoesCreated = [];
    for (const participanteId of participanteIds) {
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
      contemplacoesCreated.push(contemplacao);

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
    }

    res.json({
      message: 'Contemplação criada com sucesso',
      contemplacoes: contemplacoesCreated
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

    // Verificar quantas vezes cada participante já foi contemplado
    const contemplacoesExistentes = await Contemplacao.findAll({
      where: { consorcioId: consorcio.id }
    });

    const contemplacoesPorParticipante = {};
    for (const contemplacao of contemplacoesExistentes) {
      const pid = contemplacao.participanteId;
      contemplacoesPorParticipante[pid] = (contemplacoesPorParticipante[pid] || 0) + 1;
    }

    // Filtrar apenas não contemplados
    const participantes = todosParticipantes.filter(p => !p.contemplado);

    if (participantes.length === 0) {
      return res.status(400).json({ 
        message: 'Todos os participantes já foram contemplados' 
      });
    }

    // Calcular total de cotas disponíveis
    const totalCotas = participantes.reduce((sum, p) => sum + parseFloat(p.numero_cotas), 0);
    
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


    // Embaralhar listas
    const cotasInteirasEmbaralhadas = participantesCotasInteiras.sort(() => Math.random() - 0.5);
    const cotasFracionariasEmbaralhadas = participantesCotasFracionarias.sort(() => Math.random() - 0.5);

    // Criar lista de meses disponíveis
    const mesesDisponiveis = Array.from({ length: consorcio.prazo_meses }, (_, i) => i + 1);
    const mesesEmbaralhados = mesesDisponiveis.sort(() => Math.random() - 0.5);

    const contemplacoesGeradas = [];
    let mesIndex = 0;

    // Primeiro, contemplar participantes com cotas inteiras
    for (const participanteCota of cotasInteirasEmbaralhadas) {
      if (mesIndex >= mesesEmbaralhados.length) break;

      const mesContemplacao = mesesEmbaralhados[mesIndex];

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

      // Não marcar como contemplado ainda - participante pode ter mais cotas

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
          const dataInicio = new Date(consorcio.data_inicio);
          const dataContemplacao = new Date(dataInicio);
          dataContemplacao.setMonth(dataInicio.getMonth() + mesContemplacao - 1);

          // Criar contemplação para cada participante do grupo
          for (const participante of grupoAtual) {
            const contemplacao = await Contemplacao.create({
              consorcioId: consorcio.id,
              participanteId: participante.participante.participanteId,
              mes_contemplacao: mesContemplacao,
              data_contemplacao: dataContemplacao,
              valor_contemplado: consorcio.montante_total,
              tipo_contemplacao: 'automatico'
            });

            contemplacoesGeradas.push(contemplacao);
          }

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
      const dataInicio = new Date(consorcio.data_inicio);
      const dataContemplacao = new Date(dataInicio);
      dataContemplacao.setMonth(dataInicio.getMonth() + mesContemplacao - 1);

      // Criar contemplação para cada participante do grupo
      for (const participante of grupoAtual) {
        const contemplacao = await Contemplacao.create({
          consorcioId: consorcio.id,
          participanteId: participante.participante.participanteId,
          mes_contemplacao: mesContemplacao,
          data_contemplacao: dataContemplacao,
          valor_contemplado: consorcio.montante_total,
          tipo_contemplacao: 'automatico'
        });

        contemplacoesGeradas.push(contemplacao);
      }

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
    }

    // Atualizar status dos participantes que foram totalmente contemplados
    const participantesContemplados = new Map();
    for (const contemplacao of contemplacoesGeradas) {
      const participanteId = contemplacao.participanteId;
      if (!participantesContemplados.has(participanteId)) {
        participantesContemplados.set(participanteId, []);
      }
      participantesContemplados.get(participanteId).push(contemplacao);
    }

    // Para cada participante, verificar se todas as cotas foram contempladas
    for (const [participanteId, contemplacoesParticipante] of participantesContemplados) {
      const participante = participantes.find(p => p.participanteId === participanteId);
      if (participante) {
        const totalCotasContempladas = contemplacoesParticipante.length;
        const totalCotasParticipante = parseFloat(participante.numero_cotas);
        
        // Se contemplou todas as cotas (aproximadamente), marcar como contemplado
        if (totalCotasContempladas >= Math.floor(totalCotasParticipante)) {
          const ultimaContemplacao = contemplacoesParticipante[contemplacoesParticipante.length - 1];
          await ConsorcioParticipante.update(
            { 
              contemplado: true, 
              mes_contemplacao: ultimaContemplacao.mes_contemplacao,
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