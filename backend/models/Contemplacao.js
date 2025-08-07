const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contemplacao = sequelize.define('Contemplacao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  consorcioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'consorcios',
      key: 'id'
    }
  },
  participanteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'participantes',
      key: 'id'
    }
  },
  mes_contemplacao: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 120
    }
  },
  data_contemplacao: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  valor_contemplado: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  tipo_contemplacao: {
    type: DataTypes.ENUM('sorteio', 'lance', 'automatico'),
    defaultValue: 'automatico'
  },
  valor_lance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'contemplacoes',
  timestamps: true,
  indexes: [
    {
      fields: ['consorcioId']
    },
    {
      fields: ['participanteId']
    },
    {
      fields: ['mes_contemplacao']
    },
    {
      fields: ['data_contemplacao']
    },
    {
      fields: ['consorcioId', 'participanteId', 'mes_contemplacao']
    }
  ]
});

module.exports = Contemplacao;