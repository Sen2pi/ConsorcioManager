const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { Gestor } = require('../models');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  senha: Joi.string().min(8).required()
});

const registerSchema = Joi.object({
  nome: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  senha: Joi.string().min(8).required(),
  telefone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
});

router.post('/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, senha } = req.body;

    const gestor = await Gestor.findOne({ where: { email } });
    if (!gestor) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (!gestor.ativo) {
      return res.status(401).json({ message: 'Conta desativada' });
    }

    const senhaValida = await bcrypt.compare(senha, gestor.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { gestorId: gestor.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      gestor: {
        id: gestor.id,
        nome: gestor.nome,
        email: gestor.email,
        telefone: gestor.telefone
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nome, email, senha, telefone } = req.body;

    const gestorExistente = await Gestor.findOne({ where: { email } });
    if (gestorExistente) {
      return res.status(409).json({ message: 'Email já está em uso' });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const novoGestor = await Gestor.create({
      nome,
      email,
      senha: senhaHash,
      telefone
    });

    const token = jwt.sign(
      { gestorId: novoGestor.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'Gestor criado com sucesso',
      token,
      gestor: {
        id: novoGestor.id,
        nome: novoGestor.nome,
        email: novoGestor.email,
        telefone: novoGestor.telefone
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({
    gestor: {
      id: req.gestor.id,
      nome: req.gestor.nome,
      email: req.gestor.email,
      telefone: req.gestor.telefone
    }
  });
});

module.exports = router;