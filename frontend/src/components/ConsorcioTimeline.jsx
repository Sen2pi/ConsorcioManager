import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Schedule,
  Warning,
  EmojiEvents,
  Payment,
  AutoMode,
  PersonAdd,
  Edit,
  Delete
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const ConsorcioTimeline = ({ consorcioId }) => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  const [contemplacaoDialog, setContemplacaoDialog] = useState(false);
  const [editContemplacaoDialog, setEditContemplacaoDialog] = useState(false);
  const [selectedMes, setSelectedMes] = useState(null);
  const [editingContemplacao, setEditingContemplacao] = useState(null);
  const [contemplacaoData, setContemplacaoData] = useState({
    participanteId: '',
    tipo_contemplacao: 'automatico',
    valor_lance: '',
    observacoes: ''
  });

  const { data: timelineData, isLoading } = useQuery(
    ['consorcio-timeline', consorcioId],
    async () => {
      const response = await api.get(`/timeline/consorcios/${consorcioId}/timeline`);
      return response.data;
    },
    { refetchInterval: 30000 }
  );

  const contemplacaoMutation = useMutation(
    async (data) => {
      return await api.post(`/timeline/consorcios/${consorcioId}/contemplar`, data);
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Participante contemplado com sucesso!', { variant: 'success' });
        setContemplacaoDialog(false);
        setContemplacaoData({ participanteId: '', tipo_contemplacao: 'automatico', valor_lance: '', observacoes: '' });
        queryClient.invalidateQueries(['consorcio-timeline', consorcioId]);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao contemplar participante',
          { variant: 'error' }
        );
      }
    }
  );

  const autoContemplacaoMutation = useMutation(
    async () => {
      return await api.post(`/timeline/consorcios/${consorcioId}/auto-contemplar`);
    },
    {
      onSuccess: (response) => {
        enqueueSnackbar(response.data.message, { variant: 'success' });
        queryClient.invalidateQueries(['consorcio-timeline', consorcioId]);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro na auto-contemplação',
          { variant: 'error' }
        );
      }
    }
  );

  const marcarPagamentoMutation = useMutation(
    async ({ pagamentoId, valor }) => {
      return await api.put(`/timeline/pagamentos/${pagamentoId}/pagar`, { valor_pago: valor });
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Pagamento registrado com sucesso!', { variant: 'success' });
        queryClient.invalidateQueries(['consorcio-timeline', consorcioId]);
        queryClient.invalidateQueries(['pagamentos-mes']);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao registrar pagamento',
          { variant: 'error' }
        );
      }
    }
  );

  const editContemplacaoMutation = useMutation(
    async ({ contemplacaoId, data }) => {
      return await api.put(`/timeline/contemplacoes/${contemplacaoId}`, data);
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Contemplação atualizada com sucesso!', { variant: 'success' });
        setEditContemplacaoDialog(false);
        setEditingContemplacao(null);
        queryClient.invalidateQueries(['consorcio-timeline', consorcioId]);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao atualizar contemplação',
          { variant: 'error' }
        );
      }
    }
  );

  const deleteContemplacaoMutation = useMutation(
    async (contemplacaoId) => {
      return await api.delete(`/timeline/contemplacoes/${contemplacaoId}`);
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Contemplação removida com sucesso!', { variant: 'success' });
        queryClient.invalidateQueries(['consorcio-timeline', consorcioId]);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao remover contemplação',
          { variant: 'error' }
        );
      }
    }
  );

  const handleContemplar = (mes) => {
    setSelectedMes(mes);
    setContemplacaoDialog(true);
  };

  const handleSubmitContemplacao = () => {
    if (!contemplacaoData.participanteId) {
      enqueueSnackbar('Selecione um participante', { variant: 'error' });
      return;
    }

    contemplacaoMutation.mutate({
      ...contemplacaoData,
      mes_contemplacao: selectedMes,
      valor_lance: contemplacaoData.valor_lance ? parseFloat(contemplacaoData.valor_lance) : undefined
    });
  };

  const handleEditContemplacao = (contemplacao) => {
    setEditingContemplacao(contemplacao);
    setContemplacaoData({
      participanteId: contemplacao.participanteId,
      mes_contemplacao: contemplacao.mes_contemplacao,
      tipo_contemplacao: contemplacao.tipo_contemplacao || 'automatico',
      valor_lance: contemplacao.valor_lance || '',
      observacoes: contemplacao.observacoes || ''
    });
    setEditContemplacaoDialog(true);
  };

  const handleDeleteContemplacao = (contemplacaoId) => {
    if (window.confirm('Tem certeza que deseja remover esta contemplação?')) {
      deleteContemplacaoMutation.mutate(contemplacaoId);
    }
  };

  const handleSubmitEditContemplacao = () => {
    editContemplacaoMutation.mutate({
      contemplacaoId: editingContemplacao.id,
      data: contemplacaoData
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pago': return 'success';
      case 'pendente': return 'warning';
      case 'em_atraso': return 'error';
      case 'parcial': return 'info';
      default: return 'default';
    }
  };

  if (isLoading) return <LinearProgress />;
  if (!timelineData) return <Alert severity="error">Erro ao carregar dados</Alert>;

  const { consorcio, resumo, contemplacoes, participantes } = timelineData;

  // Criar array de meses
  const meses = Array.from({ length: consorcio.prazo_meses }, (_, i) => i + 1);

  return (
    <Box>
      {/* Resumo Geral */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resumo do Consórcio
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {resumo.cotasPreenchidas}/{consorcio.numero_cotas}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Cotas Preenchidas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {contemplacoes.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Contemplados
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {resumo.percentual_pago}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pagamentos em Dia
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="error.main">
                  {resumo.em_atraso}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Em Atraso
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <LinearProgress 
            variant="determinate" 
            value={resumo.percentual_pago} 
            sx={{ height: 8, borderRadius: 4, mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<AutoMode />}
              onClick={() => autoContemplacaoMutation.mutate()}
              disabled={autoContemplacaoMutation.isLoading}
            >
              Auto-Contemplar Todos
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Timeline de Meses */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Timeline de Pagamentos por Mês
          </Typography>

          {meses.map((mes) => {
            const contemplacao = contemplacoes.find(c => c.mes_contemplacao === mes);
            const dataInicio = new Date(consorcio.data_inicio);
            const dataMes = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + mes - 1, 1);
            const mesNome = dataMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            return (
              <MesAccordion
                key={mes}
                mes={mes}
                mesNome={mesNome}
                consorcioId={consorcioId}
                contemplacao={contemplacao}
                participantes={participantes}
                onContemplar={() => handleContemplar(mes)}
                onMarcarPagamento={(pagamentoId, valor) => 
                  marcarPagamentoMutation.mutate({ pagamentoId, valor })
                }
                onEditContemplacao={() => handleEditContemplacao(contemplacao)}
                onDeleteContemplacao={() => handleDeleteContemplacao(contemplacao?.id)}
              />
            );
          })}
        </CardContent>
      </Card>

      {/* Dialog de Contemplação */}
      <Dialog open={contemplacaoDialog} onClose={() => setContemplacaoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contemplar Participante - Mês {selectedMes}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Participante</InputLabel>
              <Select
                value={contemplacaoData.participanteId}
                label="Participante"
                onChange={(e) => setContemplacaoData({ ...contemplacaoData, participanteId: e.target.value })}
              >
                {participantes
                  .filter(p => !p.contemplado)
                  .map((p) => (
                    <MenuItem key={p.participanteId} value={p.participanteId}>
                      {p.Participante.nome}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Tipo de Contemplação</InputLabel>
              <Select
                value={contemplacaoData.tipo_contemplacao}
                label="Tipo de Contemplação"
                onChange={(e) => setContemplacaoData({ ...contemplacaoData, tipo_contemplacao: e.target.value })}
              >
                <MenuItem value="automatico">Automático</MenuItem>
                <MenuItem value="sorteio">Sorteio</MenuItem>
                <MenuItem value="lance">Lance</MenuItem>
              </Select>
            </FormControl>

            {contemplacaoData.tipo_contemplacao === 'lance' && (
              <TextField
                label="Valor do Lance"
                type="number"
                value={contemplacaoData.valor_lance}
                onChange={(e) => setContemplacaoData({ ...contemplacaoData, valor_lance: e.target.value })}
              />
            )}

            <TextField
              label="Observações"
              multiline
              rows={3}
              value={contemplacaoData.observacoes}
              onChange={(e) => setContemplacaoData({ ...contemplacaoData, observacoes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContemplacaoDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSubmitContemplacao}
            variant="contained"
            disabled={contemplacaoMutation.isLoading}
          >
            Contemplar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Edição de Contemplação */}
      <Dialog open={editContemplacaoDialog} onClose={() => setEditContemplacaoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Contemplação - Mês {editingContemplacao?.mes_contemplacao}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Participante</InputLabel>
              <Select
                value={contemplacaoData.participanteId}
                label="Participante"
                onChange={(e) => setContemplacaoData({ ...contemplacaoData, participanteId: e.target.value })}
              >
                {participantes
                  .filter(p => !p.contemplado)
                  .map((p) => (
                    <MenuItem key={p.participanteId} value={p.participanteId}>
                      {p.Participante.nome}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Tipo de Contemplação</InputLabel>
              <Select
                value={contemplacaoData.tipo_contemplacao}
                label="Tipo de Contemplação"
                onChange={(e) => setContemplacaoData({ ...contemplacaoData, tipo_contemplacao: e.target.value })}
              >
                <MenuItem value="automatico">Automático</MenuItem>
                <MenuItem value="sorteio">Sorteio</MenuItem>
                <MenuItem value="lance">Lance</MenuItem>
              </Select>
            </FormControl>

            {contemplacaoData.tipo_contemplacao === 'lance' && (
              <TextField
                label="Valor do Lance"
                type="number"
                value={contemplacaoData.valor_lance}
                onChange={(e) => setContemplacaoData({ ...contemplacaoData, valor_lance: e.target.value })}
              />
            )}

            <TextField
              label="Observações"
              multiline
              rows={3}
              value={contemplacaoData.observacoes}
              onChange={(e) => setContemplacaoData({ ...contemplacaoData, observacoes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditContemplacaoDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSubmitEditContemplacao}
            variant="contained"
            disabled={editContemplacaoMutation.isLoading}
          >
            Salvar Edição
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const MesAccordion = ({ mes, mesNome, consorcioId, contemplacao, participantes, onContemplar, onMarcarPagamento, onEditContemplacao, onDeleteContemplacao }) => {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPagamentos = async () => {
    if (loading || pagamentos.length > 0) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/timeline/consorcios/${consorcioId}/pagamentos/${mes}`);
      setPagamentos(response.data.pagamentos);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPago = async (pagamento) => {
    const valor = prompt('Valor pago:', pagamento.valor_esperado);
    if (valor && !isNaN(valor)) {
      onMarcarPagamento(pagamento.id, parseFloat(valor));
      // Atualizar lista local
      setPagamentos(prev => prev.map(p => 
        p.id === pagamento.id 
          ? { ...p, status: 'pago', valor_pago: parseFloat(valor), data_pagamento: new Date() }
          : p
      ));
    }
  };

  return (
    <Accordion onChange={(e, expanded) => expanded && loadPagamentos()}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Typography variant="subtitle1">
            Mês {mes} - {mesNome}
          </Typography>
          
          {contemplacao ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<EmojiEvents />}
                label={`Contemplado: ${contemplacao.Participante?.nome}`}
                color="success"
                size="small"
              />
              <IconButton
                size="small"
                color="primary"
                onClick={onEditContemplacao}
              >
                <Edit />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={onDeleteContemplacao}
              >
                <Delete />
              </IconButton>
            </Box>
          ) : (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={(e) => {
                e.stopPropagation();
                onContemplar();
              }}
            >
              Contemplar
            </Button>
          )}
        </Box>
      </AccordionSummary>
      
      <AccordionDetails>
        {loading ? (
          <LinearProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Participante</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagamentos.map((pagamento) => (
                  <TableRow key={pagamento.id}>
                    <TableCell>{pagamento.Participante?.nome}</TableCell>
                    <TableCell>R$ {pagamento.valor_esperado?.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      {new Date(pagamento.data_vencimento).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pagamento.status}
                        color={getStatusColor(pagamento.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {pagamento.status !== 'pago' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleMarcarPago(pagamento)}
                        >
                          <CheckCircle />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pago': return 'success';
    case 'pendente': return 'warning';
    case 'em_atraso': return 'error';
    case 'parcial': return 'info';
    default: return 'default';
  }
};

export default ConsorcioTimeline;