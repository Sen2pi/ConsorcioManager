const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pagamento = sequelize.define('Pagamento', {
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
  mes_referencia: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 120
    }
  },
  data_vencimento: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  data_pagamento: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  valor_esperado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  valor_pago: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('pendente', 'pago', 'em_atraso', 'parcial'),
    defaultValue: 'pendente'
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pagamentos',
  timestamps: true,
  indexes: [
    {
      fields: ['consorcioId']
    },
    {
      fields: ['participanteId']
    },
    {
      fields: ['mes_referencia']
    },
    {
      fields: ['status']
    },
    {
      fields: ['data_vencimento']
    },
    {
      unique: true,
      fields: ['consorcioId', 'participanteId', 'mes_referencia']
    }
  ]
});

module.exports = Pagamento;