const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Participante = sequelize.define('Participante', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      is: /^[\+]?[1-9][\d]{0,15}$/
    }
  },
  pix_iban: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  gestorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gestores',
      key: 'id'
    }
  }
}, {
  tableName: 'participantes',
  timestamps: true,
  indexes: [
    {
      fields: ['gestorId']
    },
    {
      fields: ['telefone', 'gestorId']
    }
  ]
});

module.exports = Participante;