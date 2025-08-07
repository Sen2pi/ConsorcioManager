const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConsorcioParticipante = sequelize.define('ConsorcioParticipante', {
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
  numero_cotas: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    validate: {
      min: 0.5,
      max: 3.0,
      isDecimal: true,
      customValidator(value) {
        const remainder = (value * 2) % 1;
        if (remainder !== 0) {
          throw new Error('Número de cotas deve ser múltiplo de 0.5');
        }
      }
    }
  },
  montante_individual: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  data_entrada: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  data_saida: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'consorcio_participantes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['consorcioId', 'participanteId'],
      name: 'unique_consorcio_participante'
    },
    {
      fields: ['consorcioId']
    },
    {
      fields: ['participanteId']
    }
  ]
});

module.exports = ConsorcioParticipante;