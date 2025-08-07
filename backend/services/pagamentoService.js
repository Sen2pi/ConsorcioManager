const { Pagamento, Consorcio, ConsorcioParticipante, Participante } = require('../models');
const { Op } = require('sequelize');

class PagamentoService {
  
  // Gerar pagamentos para um consórcio
  static async gerarPagamentosConsorcio(consorcioId) {
    const consorcio = await Consorcio.findByPk(consorcioId);
    if (!consorcio) {
      throw new Error('Consórcio não encontrado');
    }

    const participantes = await ConsorcioParticipante.findAll({
      where: { consorcioId, ativo: true },
      include: [{ model: Participante }]
    });

    const dataInicio = new Date(consorcio.data_inicio);
    const pagamentosGerados = [];

    for (const participante of participantes) {
      for (let mes = 1; mes <= consorcio.prazo_meses; mes++) {
        // Verificar se já existe pagamento para este mês
        const pagamentoExistente = await Pagamento.findOne({
          where: {
            consorcioId,
            participanteId: participante.participanteId,
            mes_referencia: mes
          }
        });

        if (!pagamentoExistente) {
          const dataVencimento = new Date(dataInicio);
          dataVencimento.setMonth(dataInicio.getMonth() + mes - 1);
          dataVencimento.setDate(8); // Dia 8 de cada mês

          // Calcular valor progressivo: valor base + taxa gestor + (acréscimo mensal * (mes - 1))
          const valorBase = participante.montante_individual;
          const taxaGestor = consorcio.taxa_gestor || 0;
          const acrescimoMensal = consorcio.acrescimo_mensal || 0;
          const acrescimoProgressivo = acrescimoMensal * (mes - 1);
          const valorComAcrescimo = parseFloat(valorBase) + parseFloat(taxaGestor) + parseFloat(acrescimoProgressivo);

          const pagamento = await Pagamento.create({
            consorcioId,
            participanteId: participante.participanteId,
            mes_referencia: mes,
            data_vencimento: dataVencimento,
            valor_esperado: valorComAcrescimo,
            status: 'pendente'
          });

          pagamentosGerados.push(pagamento);
        }
      }
    }

    return pagamentosGerados;
  }

  // Recriar pagamentos para um consórcio (quando valores são alterados)
  static async recriarPagamentosConsorcio(consorcioId) {
    const consorcio = await Consorcio.findByPk(consorcioId);
    if (!consorcio) {
      throw new Error('Consórcio não encontrado');
    }

    // Remover todos os pagamentos existentes
    await Pagamento.destroy({
      where: { consorcioId }
    });

    // Gerar novos pagamentos com valores atualizados
    return await this.gerarPagamentosConsorcio(consorcioId);
  }

  // Verificar e atualizar status de pagamentos em atraso
  static async verificarPagamentosEmAtraso() {
    const hoje = new Date();
    
    await Pagamento.update(
      { status: 'em_atraso' },
      {
        where: {
          data_vencimento: { [Op.lt]: hoje },
          status: 'pendente'
        }
      }
    );

    // Atualizar status dos participantes
    const participantesEmAtraso = await Pagamento.findAll({
      where: { status: 'em_atraso' },
      include: [{ model: Consorcio }, { model: Participante }],
      group: ['consorcioId', 'participanteId']
    });

    for (const pagamento of participantesEmAtraso) {
      await ConsorcioParticipante.update(
        { status_pagamento: 'em_atraso' },
        {
          where: {
            consorcioId: pagamento.consorcioId,
            participanteId: pagamento.participanteId
          }
        }
      );
    }
  }

  // Marcar pagamento como pago
  static async marcarPagamento(pagamentoId, valorPago) {
    const pagamento = await Pagamento.findByPk(pagamentoId);
    if (!pagamento) {
      throw new Error('Pagamento não encontrado');
    }

    let status = 'pago';
    if (valorPago < pagamento.valor_esperado) {
      status = 'parcial';
    }

    await pagamento.update({
      data_pagamento: new Date(),
      valor_pago: valorPago,
      status
    });

    // Verificar se participante tem todos os pagamentos em dia
    const pagamentosParticipante = await Pagamento.count({
      where: {
        consorcioId: pagamento.consorcioId,
        participanteId: pagamento.participanteId,
        status: { [Op.in]: ['pendente', 'em_atraso', 'parcial'] }
      }
    });

    let statusParticipante = 'em_dia';
    if (pagamentosParticipante > 0) {
      const temAtraso = await Pagamento.count({
        where: {
          consorcioId: pagamento.consorcioId,
          participanteId: pagamento.participanteId,
          status: 'em_atraso'
        }
      });
      statusParticipante = temAtraso > 0 ? 'em_atraso' : 'em_dia';
    }

    await ConsorcioParticipante.update(
      { status_pagamento: statusParticipante },
      {
        where: {
          consorcioId: pagamento.consorcioId,
          participanteId: pagamento.participanteId
        }
      }
    );

    return pagamento;
  }

  // Obter resumo de pagamentos de um consórcio
  static async getResumoConsorcio(consorcioId) {
    const totalPagamentos = await Pagamento.count({
      where: { consorcioId }
    });

    const pagamentos = await Pagamento.findAll({
      where: { consorcioId },
      attributes: ['status'],
      raw: true
    });

    const resumo = {
      total: totalPagamentos,
      pagos: pagamentos.filter(p => p.status === 'pago').length,
      pendentes: pagamentos.filter(p => p.status === 'pendente').length,
      em_atraso: pagamentos.filter(p => p.status === 'em_atraso').length,
      parciais: pagamentos.filter(p => p.status === 'parcial').length
    };

    resumo.percentual_pago = totalPagamentos > 0 ? 
      Math.round((resumo.pagos / totalPagamentos) * 100) : 0;

    return resumo;
  }
}

module.exports = PagamentoService;