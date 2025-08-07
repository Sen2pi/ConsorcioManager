const calcularMontanteMensalProgressivo = (consorcio, participante, mesAtual = null) => {
  if (!consorcio || !participante) return 0;
  
  const montanteTotal = parseFloat(consorcio.montante_total) || 0;
  const taxaGestorMensal = parseFloat(consorcio.taxa_gestor) || 0;
  const acrescimoMensalBase = parseFloat(consorcio.acrescimo_mensal) || 0;
  const prazoMeses = parseInt(consorcio.prazo_meses) || 1;
  const numeroTotalCotas = parseInt(consorcio.numero_cotas) || 1;
  const numeroCotas = parseFloat(participante.numero_cotas) || 1;
  
  // Se não foi fornecido o mês atual, calcular baseado na data de início
  if (!mesAtual) {
    const dataInicio = new Date(consorcio.data_inicio);
    const dataAtual = new Date();
    const diffTime = dataAtual.getTime() - dataInicio.getTime();
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    mesAtual = Math.max(1, Math.min(prazoMeses, diffMonths + 1));
  }
  
  // Cálculo do valor base por cota: (montante total + taxa gestor total) / número total de cotas
  const montanteComTaxaGestor = montanteTotal + (taxaGestorMensal * prazoMeses);
  const valorBasePorCota = montanteComTaxaGestor / numeroTotalCotas;
  
  // Cálculo do acréscimo progressivo: aumenta a cada mês
  const acrescimoProgressivo = acrescimoMensalBase * (mesAtual - 1);
  
  // Montante mensal para este participante
  const montanteMensal = (valorBasePorCota + acrescimoProgressivo) * numeroCotas;
  
  return Math.round(montanteMensal * 100) / 100; // Arredondar para 2 casas decimais
};

const calcularMontanteFixoMensal = (consorcio, participante) => {
  if (!consorcio || !participante) return 0;
  
  const montanteTotal = parseFloat(consorcio.montante_total) || 0;
  const taxaGestorMensal = parseFloat(consorcio.taxa_gestor) || 0;
  const prazoMeses = parseInt(consorcio.prazo_meses) || 1;
  const numeroTotalCotas = parseInt(consorcio.numero_cotas) || 1;
  const numeroCotas = parseFloat(participante.numero_cotas) || 1;
  
  // Cálculo do valor base por cota: (montante total + taxa gestor total) / número total de cotas
  const montanteComTaxaGestor = montanteTotal + (taxaGestorMensal * prazoMeses);
  const valorBasePorCota = montanteComTaxaGestor / numeroTotalCotas;
  
  // Montante mensal fixo para este participante
  const montanteMensal = valorBasePorCota * numeroCotas;
  
  return Math.round(montanteMensal * 100) / 100; // Arredondar para 2 casas decimais
};

module.exports = {
  calcularMontanteMensalProgressivo,
  calcularMontanteFixoMensal
};