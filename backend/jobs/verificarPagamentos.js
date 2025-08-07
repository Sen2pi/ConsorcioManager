const cron = require('node-cron');
const PagamentoService = require('../services/pagamentoService');

// Executar todos os dias às 6:00 AM
const verificarPagamentosJob = cron.schedule('0 6 * * *', async () => {
  console.log('🔍 Iniciando verificação de pagamentos em atraso...');
  
  try {
    await PagamentoService.verificarPagamentosEmAtraso();
    console.log('✅ Verificação de pagamentos concluída');
  } catch (error) {
    console.error('❌ Erro na verificação de pagamentos:', error);
  }
}, {
  scheduled: false,
  timezone: 'America/Sao_Paulo'
});

// Função para iniciar o job
const iniciarJobs = () => {
  verificarPagamentosJob.start();
  console.log('🚀 Jobs de verificação de pagamentos iniciados');
};

// Função para parar o job
const pararJobs = () => {
  verificarPagamentosJob.stop();
  console.log('⏹️ Jobs de verificação de pagamentos parados');
};

module.exports = {
  iniciarJobs,
  pararJobs,
  verificarPagamentosJob
};

// Se executado diretamente, rodar uma verificação
if (require.main === module) {
  (async () => {
    console.log('🔍 Executando verificação manual de pagamentos...');
    try {
      await PagamentoService.verificarPagamentosEmAtraso();
      console.log('✅ Verificação manual concluída');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro na verificação manual:', error);
      process.exit(1);
    }
  })();
}