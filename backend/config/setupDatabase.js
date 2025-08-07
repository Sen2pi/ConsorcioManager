const mysql = require('mysql2/promise');
const sequelize = require('./database');

async function setupDatabase() {
  try {
    console.log('🔧 Verificando/criando banco de dados...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      port: process.env.DB_PORT || 3306
    });

    const dbName = process.env.DB_NAME || 'consorcio_manager';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Banco de dados ${dbName} criado/verificado`);

    await connection.end();
    
    console.log('🔧 Sincronizando modelos/tabelas...');
    require('../models');
    
    await sequelize.sync({ alter: true });
    console.log('✅ Tabelas sincronizadas com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error.message);
    console.log('');
    console.log('🔍 Verifique se:');
    console.log('   - MySQL está rodando');
    console.log('   - Credenciais no .env estão corretas');
    console.log('   - Porta MySQL está disponível');
    throw error;
  }
}

module.exports = setupDatabase;