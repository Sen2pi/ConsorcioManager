const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Participante, Consorcio, ConsorcioParticipante } = require('../models');
const authenticateToken = require('../middleware/auth');
const { calcularMontanteMensalProgressivo } = require('../utils/calculoMensal');

const router = express.Router();

const participanteSchema = Joi.object({
  nome: Joi.string().min(2).max(100).required(),
  telefone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  pix_iban: Joi.string().min(1).max(150).required()
});

const updateParticipanteSchema = Joi.object({
  nome: Joi.string().min(2).max(100).optional(),
  telefone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  pix_iban: Joi.string().min(1).max(150).optional()
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = {
      gestorId: req.gestor.id,
      ativo: true
    };

    if (search && search.trim()) {
      whereClause[Op.or] = [
        { nome: { [Op.like]: `%${search}%` } },
        { telefone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: participantes } = await Participante.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      include: [
        {
          model: Consorcio,
          as: 'consorcios',
          through: { attributes: ['numero_cotas', 'montante_individual'] },
          attributes: ['id', 'nome', 'status']
        }
      ],
      order: [['nome', 'ASC']]
    });

    res.json({
      participantes,
      pagination: {
        total: count,
        page: page,
        pages: Math.ceil(count / limit),
        limit: limit
      }
    });
  } catch (error) {
    console.error('Erro ao buscar participantes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const participante = await Participante.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id,
        ativo: true
      },
      include: [
        {
          model: Consorcio,
          as: 'consorcios',
          through: { 
            attributes: ['numero_cotas', 'montante_individual', 'data_entrada', 'ativo'] 
          },
          attributes: ['id', 'nome', 'status', 'montante_total', 'prazo_meses']
        }
      ]
    });

    if (!participante) {
      return res.status(404).json({ message: 'Participante não encontrado' });
    }

    res.json({ participante });
  } catch (error) {
    console.error('Erro ao buscar participante:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error } = participanteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nome, telefone, pix_iban } = req.body;

    const participanteExistente = await Participante.findOne({
      where: {
        telefone,
        gestorId: req.gestor.id,
        ativo: true
      }
    });

    if (participanteExistente) {
      return res.status(409).json({ message: 'Já existe um participante com este telefone' });
    }

    const novoParticipante = await Participante.create({
      nome,
      telefone,
      pix_iban,
      gestorId: req.gestor.id
    });

    res.status(201).json({
      message: 'Participante criado com sucesso',
      participante: novoParticipante
    });
  } catch (error) {
    console.error('Erro ao criar participante:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = updateParticipanteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const participante = await Participante.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id,
        ativo: true
      }
    });

    if (!participante) {
      return res.status(404).json({ message: 'Participante não encontrado' });
    }

    if (req.body.telefone && req.body.telefone !== participante.telefone) {
      const telefoneExistente = await Participante.findOne({
        where: {
          telefone: req.body.telefone,
          gestorId: req.gestor.id,
          ativo: true,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (telefoneExistente) {
        return res.status(409).json({ message: 'Já existe um participante com este telefone' });
      }
    }

    await participante.update(req.body);

    res.json({
      message: 'Participante atualizado com sucesso',
      participante
    });
  } catch (error) {
    console.error('Erro ao atualizar participante:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const participante = await Participante.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id,
        ativo: true
      }
    });

    if (!participante) {
      return res.status(404).json({ message: 'Participante não encontrado' });
    }

    await participante.update({ ativo: false });

    await ConsorcioParticipante.update(
      { ativo: false },
      { where: { participanteId: participante.id } }
    );

    res.json({ message: 'Participante removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover participante:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Nova rota para obter montantes mensais progressivos
router.get('/:id/montantes-mensais', authenticateToken, async (req, res) => {
  try {
    const participante = await Participante.findOne({
      where: {
        id: req.params.id,
        gestorId: req.gestor.id,
        ativo: true
      }
    });

    if (!participante) {
      return res.status(404).json({ message: 'Participante não encontrado' });
    }

    // Buscar todos os consórcios ativos do participante
    const associacoes = await ConsorcioParticipante.findAll({
      where: {
        participanteId: participante.id,
        ativo: true
      },
      include: [
        {
          model: Consorcio,
          where: { status: 'ativo' },
          attributes: ['id', 'nome', 'montante_total', 'taxa_gestor', 'acrescimo_mensal', 'prazo_meses', 'numero_cotas', 'data_inicio']
        }
      ]
    });

    // Calcular montantes mensais progressivos
    const montantesMensais = associacoes.map(associacao => {
      const consorcio = associacao.Consorcio;
      
      if (!consorcio) {
        return {
          consorcioId: null,
          consorcioNome: 'Consórcio não encontrado',
          numeroCotas: associacao.numero_cotas,
          montanteMensal: 0,
          dataInicio: null,
          prazoMeses: 0,
          status: associacao.status_pagamento,
          contemplado: associacao.contemplado,
          mesContemplacao: associacao.mes_contemplacao
        };
      }
      
      // Usar a função de cálculo progressivo
      const montanteMensal = calcularMontanteMensalProgressivo(consorcio, associacao);
      
      return {
        consorcioId: consorcio.id,
        consorcioNome: consorcio.nome,
        numeroCotas: associacao.numero_cotas,
        montanteMensal,
        dataInicio: consorcio.data_inicio,
        prazoMeses: consorcio.prazo_meses,
        status: associacao.status_pagamento,
        contemplado: associacao.contemplado,
        mesContemplacao: associacao.mes_contemplacao
      };
    });

    res.json({
      participante: {
        id: participante.id,
        nome: participante.nome,
        telefone: participante.telefone
      },
      montantesMensais
    });

  } catch (error) {
    console.error('Erro ao calcular montantes mensais:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;