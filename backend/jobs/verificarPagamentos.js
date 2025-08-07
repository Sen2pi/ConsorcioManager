const cron = require('node-cron');
const PagamentoService = require('../services/pagamentoService');

// Executar todos os dias às 6:00 AM
const verificarPagamentosJob = cron.schedule('0 6 * * *', async () => {
  try {
    await PagamentoService.verificarPagamentosEmAtraso();
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
};

// Função para parar o job
const pararJobs = () => {
  verificarPagamentosJob.stop();
};

module.exports = {
  iniciarJobs,
  pararJobs,
  verificarPagamentosJob
};

// Se executado diretamente, rodar uma verificação
if (require.main === module) {
  (async () => {
    try {
      await PagamentoService.verificarPagamentosEmAtraso();
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro na verificação manual:', error);
      process.exit(1);
    }
  })();
}