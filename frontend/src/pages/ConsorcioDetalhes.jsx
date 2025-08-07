import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Add,
  Delete,
  Person,
  Business,
  CalendarToday,
  AttachMoney,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import ConsorcioTimeline from '../components/ConsorcioTimeline';

const ConsorcioDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [addParticipanteOpen, setAddParticipanteOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [participanteData, setParticipanteData] = useState({
    participanteId: '',
    numero_cotas: 1,
    montante_individual: '',
  });

  const calcularMontanteIndividual = (numeroCotas) => {
    if (!consorcio || !numeroCotas) return 0;
    
    const montanteTotal = parseFloat(consorcio.montante_total) || 0;
    const taxaGestorMensal = parseFloat(consorcio.taxa_gestor) || 0;
    const prazoMeses = parseInt(consorcio.prazo_meses) || 1;
    const numeroTotalCotas = parseInt(consorcio.numero_cotas) || 1;
    
    // Cálculo correto: (montante total + taxa gestor total) / número total de cotas * cotas do participante
    const montanteComTaxaGestor = montanteTotal + (taxaGestorMensal * prazoMeses);
    const valorPorCota = montanteComTaxaGestor / numeroTotalCotas;
    const valorIndividual = valorPorCota * numeroCotas;
    
    return valorIndividual.toFixed(2);
  };

  const calcularMontanteProgressivo = (numeroCotas, mes) => {
    if (!consorcio || !numeroCotas || !mes) return 0;
    
    const montanteTotal = parseFloat(consorcio.montante_total) || 0;
    const taxaGestorMensal = parseFloat(consorcio.taxa_gestor) || 0;
    const acrescimoMensal = parseFloat(consorcio.acrescimo_mensal) || 0;
    const prazoMeses = parseInt(consorcio.prazo_meses) || 1;
    const numeroTotalCotas = parseInt(consorcio.numero_cotas) || 1;
    
    // Cálculo base: (montante total + taxa gestor total) / número total de cotas
    const montanteComTaxaGestor = montanteTotal + (taxaGestorMensal * prazoMeses);
    const valorBasePorCota = montanteComTaxaGestor / numeroTotalCotas;
    
    // Valor base para este participante
    const valorBase = valorBasePorCota * numeroCotas;
    
    // Taxa do gestor mensal para este participante
    const taxaGestorParticipante = taxaGestorMensal * numeroCotas;
    
    // Acréscimo progressivo: aumenta a cada mês
    const acrescimoProgressivo = acrescimoMensal * (mes - 1);
    
    // Montante mensal para este participante
    const montanteMensal = valorBase + taxaGestorParticipante + acrescimoProgressivo;
    
    return montanteMensal.toFixed(2);
  };

  const { data, isLoading, error } = useQuery(
    ['consorcio', id],
    async () => {
      const response = await api.get(`/consorcios/${id}`);
      return response.data;
    }
  );

  const { data: participantesDisponiveis } = useQuery(
    ['participantes-disponiveis', id],
    async () => {
      const response = await api.get('/participantes');
      return response.data;
    },
    {
      enabled: addParticipanteOpen,
    }
  );

  // Nova query para buscar participantes com montantes mensais progressivos
  const { data: participantesComMontantes, isLoading: isLoadingParticipantes } = useQuery(
    ['consorcio-participantes', id],
    async () => {
      console.log('Buscando participantes do consórcio:', id);
      const response = await api.get(`/consorcios/${id}/participantes`);
      console.log('Resposta da API:', response.data);
      return response.data;
    },
    {
      enabled: !!data,
    }
  );

  const addParticipanteMutation = useMutation(
    (data) => api.post(`/consorcios/${id}/participantes`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['consorcio', id]);
        queryClient.invalidateQueries(['consorcio-participantes', id]);
        enqueueSnackbar('Participante adicionado com sucesso!', { variant: 'success' });
        setAddParticipanteOpen(false);
        setParticipanteData({
          participanteId: '',
          numero_cotas: 1,
          montante_individual: '',
        });
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao adicionar participante',
          { variant: 'error' }
        );
      },
    }
  );

  const removeParticipanteMutation = useMutation(
    (participanteId) => api.delete(`/consorcios/${id}/participantes/${participanteId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['consorcio', id]);
        queryClient.invalidateQueries(['consorcio-participantes', id]);
        enqueueSnackbar('Participante removido com sucesso!', { variant: 'success' });
        setRemoveConfirm(null);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao remover participante',
          { variant: 'error' }
        );
      },
    }
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo': return 'primary';
      case 'fechado': return 'success';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const handleAddParticipante = () => {
    if (!participanteData.participanteId || !participanteData.montante_individual) {
      enqueueSnackbar('Preencha todos os campos obrigatórios', { variant: 'error' });
      return;
    }

    addParticipanteMutation.mutate({
      ...participanteData,
      montante_individual: parseFloat(participanteData.montante_individual),
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Erro ao carregar dados do consórcio. Tente novamente.
      </Alert>
    );
  }

  const consorcio = data?.consorcio;

  if (!consorcio) {
    return (
      <Alert severity="warning">
        Consórcio não encontrado.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/consorcios')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">
            {consorcio.nome}
          </Typography>
          <Chip
            label={consorcio.status}
            color={getStatusColor(consorcio.status)}
            sx={{ mt: 1 }}
          />
        </Box>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => navigate(`/consorcios/${id}/edit`)}
        >
          Editar
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações do Consórcio
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoney sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Montante Total
                    </Typography>
                    <Typography variant="h6">
                      R$ {consorcio.montante_total?.toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarToday sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Prazo
                    </Typography>
                    <Typography variant="body1">
                      {consorcio.prazo_meses} meses
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Business sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Número de Cotas
                    </Typography>
                    <Typography variant="body1">
                      {consorcio.numero_cotas}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoney sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Taxa do Gestor (Mensal)
                    </Typography>
                    <Typography variant="body1">
                      R$ {(consorcio.taxa_gestor || 0).toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoney sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Acréscimo Mensal
                    </Typography>
                    <Typography variant="body1">
                      R$ {(consorcio.acrescimo_mensal || 0).toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Data de Início
                </Typography>
                <Typography variant="body1">
                  {new Date(consorcio.data_inicio).toLocaleDateString('pt-BR')}
                </Typography>
              </Box>

              {consorcio.data_fim && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Data de Fim
                  </Typography>
                  <Typography variant="body1">
                    {new Date(consorcio.data_fim).toLocaleDateString('pt-BR')}
                  </Typography>
                </Box>
              )}

              {consorcio.descricao && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Descrição
                  </Typography>
                  <Typography variant="body1">
                    {consorcio.descricao}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Participantes ({participantesComMontantes?.participantes?.length || 0})
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setAddParticipanteOpen(true)}
                >
                  Adicionar
                </Button>
              </Box>
              
              {isLoadingParticipantes ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : !participantesComMontantes?.participantes || participantesComMontantes.participantes.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  Nenhum participante neste consórcio
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Telefone</TableCell>
                        <TableCell>Cotas</TableCell>
                        <TableCell>Valor Individual</TableCell>
                        <TableCell>Montante Mensal Progressivo</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {participantesComMontantes?.participantes?.map((participante) => (
                        <TableRow key={participante.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {participante.nome}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {participante.telefone}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {participante.numero_cotas}
                          </TableCell>
                          <TableCell>
                            R$ {participante.montante_individual?.toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              R$ {participante.montante_mensal_progressivo?.toLocaleString('pt-BR')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={participante.contemplado ? 'Contemplado' : 'Em Dia'}
                              color={participante.contemplado ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setRemoveConfirm(participante)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Timeline do Consórcio */}
      <Box sx={{ mt: 4 }}>
        <ConsorcioTimeline consorcioId={id} />
      </Box>

      {/* Dialog Adicionar Participante */}
      <Dialog 
        open={addParticipanteOpen} 
        onClose={() => setAddParticipanteOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar Participante</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Participante</InputLabel>
              <Select
                value={participanteData.participanteId}
                label="Participante"
                onChange={(e) => setParticipanteData({ ...participanteData, participanteId: e.target.value })}
              >
                {participantesDisponiveis?.participantes?.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Número de Cotas"
              type="number"
              inputProps={{ min: 0.5, max: 3, step: 0.5 }}
              value={participanteData.numero_cotas}
              onChange={(e) => {
                const valor = parseFloat(e.target.value);
                setParticipanteData({ 
                  ...participanteData, 
                  numero_cotas: valor,
                  montante_individual: calcularMontanteIndividual(valor)
                });
              }}
            />

            <TextField
              label="Valor Individual"
              type="number"
              value={participanteData.montante_individual}
              onChange={(e) => setParticipanteData({ ...participanteData, montante_individual: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />

            {/* Seção de cálculo progressivo */}
            {participanteData.numero_cotas > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Cálculo Progressivo por Mês (exemplo com {participanteData.numero_cotas} cotas):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[1, 2, 3, 4, 5, 6].map((mes) => (
                    <Chip
                      key={mes}
                      label={`Mês ${mes}: R$ ${calcularMontanteProgressivo(participanteData.numero_cotas, mes)}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  O valor aumenta progressivamente a cada mês conforme o acréscimo mensal configurado.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddParticipanteOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleAddParticipante}
            variant="contained"
            disabled={addParticipanteMutation.isLoading}
          >
            {addParticipanteMutation.isLoading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Remoção */}
      <Dialog open={Boolean(removeConfirm)} onClose={() => setRemoveConfirm(null)}>
        <DialogTitle>Confirmar Remoção</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover o participante "{removeConfirm?.nome}" deste consórcio?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirm(null)}>Cancelar</Button>
          <Button 
            onClick={() => removeParticipanteMutation.mutate(removeConfirm.id)}
            color="error" 
            variant="contained"
            disabled={removeParticipanteMutation.isLoading}
          >
            {removeParticipanteMutation.isLoading ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsorcioDetalhes;