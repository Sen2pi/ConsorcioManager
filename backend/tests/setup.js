const sequelize = require('../config/database');
const { Gestor, Participante, Consorcio, ConsorcioParticipante } = require('../models');

// Configurar banco de dados de teste
const setupTestDatabase = async () => {
  try {
    // Sincronizar modelos sem forçar drop (cria tabelas se não existirem)
    await sequelize.sync({ force: false });
    console.log('✅ Banco de dados de teste configurado');
  } catch (error) {
    console.error('❌ Erro ao configurar banco de teste:', error);
    throw error;
  }
};

// Limpar dados de teste
const cleanupTestDatabase = async () => {
  try {
    await ConsorcioParticipante.destroy({ where: {} });
    await Consorcio.destroy({ where: {} });
    await Participante.destroy({ where: {} });
    await Gestor.destroy({ where: {} });
    console.log('🧹 Dados de teste limpos');
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error);
  }
};

// Fechar conexão do banco
const closeTestDatabase = async () => {
  try {
    await sequelize.close();
    console.log('🔌 Conexão do banco de teste fechada');
  } catch (error) {
    console.error('❌ Erro ao fechar conexão:', error);
  }
};

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase
};
