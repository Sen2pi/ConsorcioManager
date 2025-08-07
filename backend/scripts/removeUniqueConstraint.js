require('dotenv').config();
const sequelize = require('../config/database');

async function removeUniqueConstraint() {
  try {
    console.log('Conectando à base de dados...');
    await sequelize.authenticate();
    
    console.log('Removendo constraint única da tabela contemplacoes...');
    
    // Remove as constraints únicas existentes
    try {
      await sequelize.query(`
        ALTER TABLE contemplacoes 
        DROP INDEX contemplacoes_consorcio_id_mes_contemplacao
      `);
      console.log('Primeira constraint removida.');
    } catch (err) {
      console.log('Primeira constraint já foi removida:', err.message);
    }

    try {
      await sequelize.query(`
        ALTER TABLE contemplacoes 
        DROP INDEX contemplacoes_consorcio_id_participante_id_mes_contemplacao
      `);
      console.log('Segunda constraint removida.');
    } catch (err) {
      console.log('Segunda constraint já foi removida:', err.message);
    }
    
    console.log('Constraint única removida com sucesso!');
    console.log('Agora é possível ter múltiplas contemplações no mesmo mês.');
    
  } catch (error) {
    if (error.message.includes("doesn't exist")) {
      console.log('A constraint única já foi removida ou não existe.');
    } else {
      console.error('Erro ao remover constraint:', error.message);
    }
  } finally {
    await sequelize.close();
    console.log('Conexão fechada.');
  }
}

removeUniqueConstraint();