const mysql = require('mysql2/promise');

async function setupTestDatabase() {
  try {
    console.log('🔧 Configurando banco de dados de teste...');
    
    // Conectar ao MySQL
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      port: 3306
    });

    // Criar banco de dados de teste
    await connection.execute('CREATE DATABASE IF NOT EXISTS consorcio_manager_test');
    console.log('✅ Banco de dados consorcio_manager_test criado/verificado');

    // Fechar conexão
    await connection.end();
    
    console.log('🎉 Configuração do banco de teste concluída!');
    console.log('💡 Agora você pode executar: npm test');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de teste:', error.message);
    console.log('');
    console.log('🔍 Verifique se:');
    console.log('   - MySQL está rodando');
    console.log('   - Usuário root com senha "root" existe');
    console.log('   - Porta 3306 está disponível');
    process.exit(1);
  }
}

if (require.main === module) {
  setupTestDatabase();
}

module.exports = setupTestDatabase;
