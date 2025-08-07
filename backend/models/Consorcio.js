const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Consorcio = sequelize.define('Consorcio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 150]
    }
  },
  montante_total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  prazo_meses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 120
    }
  },
  numero_cotas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  status: {
    type: DataTypes.ENUM('ativo', 'fechado', 'cancelado'),
    defaultValue: 'ativo'
  },
  data_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  data_fim: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'consorcios',
  timestamps: true,
  indexes: [
    {
      fields: ['gestorId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['data_inicio']
    }
  ]
});

module.exports = Consorcio;