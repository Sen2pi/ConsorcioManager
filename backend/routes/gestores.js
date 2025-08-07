const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { Gestor } = require('../models');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const updateGestorSchema = Joi.object({
  nome: Joi.string().min(2).max(100).optional(),
  telefone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  senha: Joi.string().min(8).optional()
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      gestor: {
        id: req.gestor.id,
        nome: req.gestor.nome,
        email: req.gestor.email,
        telefone: req.gestor.telefone,
        createdAt: req.gestor.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { error } = updateGestorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const updateData = {};
    if (req.body.nome) updateData.nome = req.body.nome;
    if (req.body.telefone) updateData.telefone = req.body.telefone;
    
    if (req.body.senha) {
      updateData.senha = await bcrypt.hash(req.body.senha, 12);
    }

    await Gestor.update(updateData, {
      where: { id: req.gestor.id }
    });

    const gestorAtualizado = await Gestor.findByPk(req.gestor.id, {
      attributes: { exclude: ['senha'] }
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      gestor: gestorAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    await Gestor.update(
      { ativo: false },
      { where: { id: req.gestor.id } }
    );

    res.json({ message: 'Conta desativada com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar conta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;