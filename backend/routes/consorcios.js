const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Consorcio, Participante, ConsorcioParticipante, Gestor } = require('../models');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const consorcioSchema = Joi.object({
  nome: Joi.string().min(2).max(150).required(),
  montante_total: Joi.number().min(0).required(),
  prazo_meses: Joi.number().integer().min(1).max(120).required(),
  numero_cotas: Joi.number().integer().min(1).required(),
  taxa_gestor: Joi.number().min(0).optional(),
  acrescimo_mensal: Joi.number().min(0).optional(),
  status: Joi.string().valid('ativo', 'fechado', 'cancelado').optional(),
  data_inicio: Joi.date().required(),
  data_fim: Joi.date().optional(),
  descricao: Joi.string().optional()
});

const updateConsorcioSchema = Joi.object({
  nome: Joi.string().min(2).max(150).optional(),
  montante_total: Joi.number().min(0).optional(),
  prazo_meses: Joi.number().integer().min(1).max(120).optional(),
  numero_cotas: Joi.number().integer().min(1).optional(),
  taxa_gestor: Joi.number().min(0).optional(),
  acrescimo_mensal: Joi.number().min(0).optional(),
  status: Joi.string().valid('ativo', 'fechado', 'cancelado').optional(),
  data_inicio: Joi.date().optional(),
  data_fim: Joi.date().optional(),
  descricao: Joi.string().optional()
});

const addParticipanteSchema = Joi.object({
  participanteId: Joi.number().integer().required(),
  numero_cotas: Joi.number().multiple(0.5).min(0.5).max(3.0).required(),
  montante_individual: Joi.number().positive().required()
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all', search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { gestorId: req.gestor.id };

    if (status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.nome = { [Op.like]: `%${search}%` };
    }

    const { count, rows: consorcios } = await Consorcio.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Participante,
          as: 'participantes',
          through: { attributes: ['numero_cotas', 'montante_individual'] },
          attributes: ['id', 'nome']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      consorcios,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar consórcios:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const ativos = await Consorcio.count({
      where: { gestorId: req.gestor.id, status: 'ativo' }
    });

    const fechados = await Consorcio.count({
      where: { gestorId: req.gestor.id, status: 'fechado' }
    });

    const totalParticipantes = await Participante.count({
      where: { gestorId: req.gestor.id, ativo: true }
    });

    const consorciosRecentes = await Consorcio.findAll({
      where: { gestorId: req.gestor.id },
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Participante,
          as: 'participantes',
          through: { attributes: ['numero_cotas'] },
          attributes: ['id', 'nome']
        }
      ]
    });

    res.json({
      estatisticas: {
        consorciosAtivos: ativos,
        consorciosFechados: fechados,
        totalParticipantes
      },
      consorciosRecentes
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const consorcio = await Consorcio.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id
      },
      include: [
        {
          model: Participante,
          as: 'participantes',
          through: { 
            attributes: ['numero_cotas', 'montante_individual', 'data_entrada', 'ativo'] 
          },
          attributes: ['id', 'nome', 'telefone', 'pix_iban']
        }
      ]
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    res.json({ consorcio });
  } catch (error) {
    console.error('Erro ao buscar consórcio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error } = consorcioSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const novoConsorcio = await Consorcio.create({
      ...req.body,
      gestorId: req.gestor.id
    });

    res.status(201).json({
      message: 'Consórcio criado com sucesso',
      consorcio: novoConsorcio
    });
  } catch (error) {
    console.error('Erro ao criar consórcio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = updateConsorcioSchema.validate(req.body);
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

    await consorcio.update(req.body);

    res.json({
      message: 'Consórcio atualizado com sucesso',
      consorcio
    });
  } catch (error) {
    console.error('Erro ao atualizar consórcio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
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

    await consorcio.destroy();

    res.json({ message: 'Consórcio removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover consórcio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/:id/participantes', authenticateToken, async (req, res) => {
  try {
    const { error } = addParticipanteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { participanteId, numero_cotas, montante_individual } = req.body;

    const consorcio = await Consorcio.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    const participante = await Participante.findOne({
      where: {
        id: participanteId,
        gestorId: req.gestor.id,
        ativo: true
      }
    });

    if (!participante) {
      return res.status(404).json({ message: 'Participante não encontrado' });
    }

    const associacaoExistente = await ConsorcioParticipante.findOne({
      where: {
        consorcioId: consorcio.id,
        participanteId: participante.id,
        ativo: true
      }
    });

    if (associacaoExistente) {
      return res.status(409).json({ message: 'Participante já está neste consórcio' });
    }

    await ConsorcioParticipante.create({
      consorcioId: consorcio.id,
      participanteId: participante.id,
      numero_cotas,
      montante_individual
    });

    res.status(201).json({ message: 'Participante adicionado ao consórcio com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar participante ao consórcio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.delete('/:id/participantes/:participanteId', authenticateToken, async (req, res) => {
  try {
    const { Pagamento, Contemplacao } = require('../models');
    
    const consorcio = await Consorcio.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id
      }
    });

    if (!consorcio) {
      return res.status(404).json({ message: 'Consórcio não encontrado' });
    }

    const associacao = await ConsorcioParticipante.findOne({
      where: {
        consorcioId: consorcio.id,
        participanteId: req.params.participanteId,
        ativo: true
      }
    });

    if (!associacao) {
      return res.status(404).json({ message: 'Participante não encontrado neste consórcio' });
    }

    // Remover todos os pagamentos do participante neste consórcio
    await Pagamento.destroy({
      where: {
        consorcioId: consorcio.id,
        participanteId: req.params.participanteId
      }
    });

    // Remover todas as contemplações do participante neste consórcio
    await Contemplacao.destroy({
      where: {
        consorcioId: consorcio.id,
        participanteId: req.params.participanteId
      }
    });

    // Remover da associação consórcio-participante
    await associacao.update({ ativo: false, data_saida: new Date() });

    res.json({ message: 'Participante removido do consórcio com sucesso' });
  } catch (error) {
    console.error('Erro ao remover participante do consórcio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;