const Gestor = require('./Gestor');
const Participante = require('./Participante');
const Consorcio = require('./Consorcio');
const ConsorcioParticipante = require('./ConsorcioParticipante');
const Pagamento = require('./Pagamento');
const Contemplacao = require('./Contemplacao');

Gestor.hasMany(Participante, { foreignKey: 'gestorId', onDelete: 'CASCADE' });
Participante.belongsTo(Gestor, { foreignKey: 'gestorId' });

Gestor.hasMany(Consorcio, { foreignKey: 'gestorId', onDelete: 'CASCADE' });
Consorcio.belongsTo(Gestor, { foreignKey: 'gestorId' });

Consorcio.belongsToMany(Participante, { 
  through: ConsorcioParticipante, 
  foreignKey: 'consorcioId',
  otherKey: 'participanteId',
  as: 'participantes'
});

Participante.belongsToMany(Consorcio, { 
  through: ConsorcioParticipante, 
  foreignKey: 'participanteId',
  otherKey: 'consorcioId',
  as: 'consorcios'
});

ConsorcioParticipante.belongsTo(Consorcio, { foreignKey: 'consorcioId' });
ConsorcioParticipante.belongsTo(Participante, { foreignKey: 'participanteId' });

Consorcio.hasMany(ConsorcioParticipante, { foreignKey: 'consorcioId', onDelete: 'CASCADE' });
Participante.hasMany(ConsorcioParticipante, { foreignKey: 'participanteId', onDelete: 'CASCADE' });

// Relacionamentos Pagamentos
Consorcio.hasMany(Pagamento, { foreignKey: 'consorcioId', onDelete: 'CASCADE' });
Participante.hasMany(Pagamento, { foreignKey: 'participanteId', onDelete: 'CASCADE' });
Pagamento.belongsTo(Consorcio, { foreignKey: 'consorcioId' });
Pagamento.belongsTo(Participante, { foreignKey: 'participanteId' });

// Relacionamentos Contemplações
Consorcio.hasMany(Contemplacao, { foreignKey: 'consorcioId', onDelete: 'CASCADE' });
Participante.hasMany(Contemplacao, { foreignKey: 'participanteId', onDelete: 'CASCADE' });
Contemplacao.belongsTo(Consorcio, { foreignKey: 'consorcioId' });
Contemplacao.belongsTo(Participante, { foreignKey: 'participanteId' });

module.exports = {
  Gestor,
  Participante,
  Consorcio,
  ConsorcioParticipante,
  Pagamento,
  Contemplacao
};