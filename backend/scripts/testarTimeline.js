require('dotenv').config();
const { Contemplacao, Participante, ConsorcioParticipante } = require('../models');

async function testarTimeline() {
  try {
    console.log('=== Testando dados do timeline ===');
    
    // Obter contemplações
    const contemplacoes = await Contemplacao.findAll({
      where: { consorcioId: 1 },
      include: [{ model: Participante, attributes: ['nome'] }],
      order: [['mes_contemplacao', 'ASC']]
    });

    console.log('Contemplações na base de dados:');
    for (const c of contemplacoes) {
      console.log(`- Mês ${c.mes_contemplacao}: ${c.Participante.nome} (ID: ${c.participanteId})`);
    }

    // Obter participantes
    const participantes = await ConsorcioParticipante.findAll({
      where: { consorcioId: 1, ativo: true },
      include: [{ model: Participante, attributes: ['nome'] }]
    });

    console.log('\nParticipantes:');
    for (const p of participantes) {
      console.log(`- ${p.Participante.nome}: ${p.numero_cotas} cotas, contemplado: ${p.contemplado}, mês: ${p.mes_contemplacao}`);
    }

    // Agrupar contemplações por mês
    const contemplacoesPorMes = {};
    for (const contemplacao of contemplacoes) {
      const mes = contemplacao.mes_contemplacao;
      if (!contemplacoesPorMes[mes]) {
        contemplacoesPorMes[mes] = [];
      }
      
      const participante = participantes.find(p => p.participanteId === contemplacao.participanteId);
      if (participante) {
        contemplacoesPorMes[mes].push({
          id: contemplacao.participanteId,
          nome: contemplacao.Participante.nome,
          cotas: participante.numero_cotas,
          contemplacaoId: contemplacao.id
        });
      }
    }

    console.log('\nContemplações por mês (dados para frontend):');
    for (const [mes, participantes] of Object.entries(contemplacoesPorMes)) {
      console.log(`Mês ${mes}:`);
      for (const p of participantes) {
        console.log(`  - ${p.nome} (${p.cotas} cotas)`);
      }
    }

  } catch (error) {
    console.error('Erro:', error);
  }
}

testarTimeline();