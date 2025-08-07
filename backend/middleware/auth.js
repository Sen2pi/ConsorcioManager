const jwt = require('jsonwebtoken');
const { Gestor } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token de acesso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const gestor = await Gestor.findByPk(decoded.gestorId, {
      attributes: { exclude: ['senha'] }
    });

    if (!gestor || !gestor.ativo) {
      return res.status(401).json({ message: 'Gestor não encontrado ou inativo' });
    }

    req.gestor = gestor;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(403).json({ message: 'Token inválido' });
  }
};

module.exports = authenticateToken;