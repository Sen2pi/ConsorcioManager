require('dotenv').config();
const { Contemplacao, ConsorcioParticipante } = require('../models');

async function limparContemplacoes() {
  try {
    console.log('Limpando contemplações...');
    
    // Remover todas as contemplações do consórcio
    await Contemplacao.destroy({
      where: { consorcioId: 1 }
    });
    
    // Resetar status dos participantes
    await ConsorcioParticipante.update(
      { 
        contemplado: false,
        mes_contemplacao: null,
        status_pagamento: 'em_dia'
      },
      {
        where: { consorcioId: 1 }
      }
    );
    
    console.log('Contemplações limpas com sucesso!');
    
  } catch (error) {
    console.error('Erro ao limpar contemplações:', error.message);
  }
}

limparContemplacoes();