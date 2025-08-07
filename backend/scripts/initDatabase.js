const sequelize = require('../config/database');
const { Gestor, Participante, Consorcio, ConsorcioParticipante } = require('../models');

async function initDatabase() {
  try {
    console.log('🔄 Testando conexão com o banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida com sucesso.');

    console.log('🔄 Sincronizando modelos com o banco de dados...');
    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados com sucesso.');

    console.log('🎉 Banco de dados inicializado com sucesso!');
    console.log('');
    console.log('📊 Tabelas criadas:');
    console.log('  - gestores');
    console.log('  - participantes');
    console.log('  - consorcios');
    console.log('  - consorcio_participantes');
    console.log('');
    console.log('🚀 Você pode agora iniciar o servidor com: npm run dev');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;