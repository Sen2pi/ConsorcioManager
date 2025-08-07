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

  const { data, isLoading, error } = useQuery(
    ['consorcio', id],
    async () => {
      const response = await api.get(`/consorcios/${id}`);
      return response.data;
    }
  );

  const { data: participantesDisponiveis } = useQuery(
    'participantes-disponiveis',
    async () => {
      const response = await api.get('/participantes');
      return response.data;
    },
    {
      enabled: addParticipanteOpen,
    }
  );

  const addParticipanteMutation = useMutation(
    (data) => api.post(`/consorcios/${id}/participantes`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['consorcio', id]);
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
                  Participantes ({consorcio.participantes?.length || 0})
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
              
              {consorcio.participantes?.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  Nenhum participante neste consórcio
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Cotas</TableCell>
                        <TableCell>Valor</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {consorcio.participantes?.map((participante) => (
                        <TableRow key={participante.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {participante.nome}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {participante.ConsorcioParticipante?.numero_cotas}
                          </TableCell>
                          <TableCell>
                            R$ {participante.ConsorcioParticipante?.montante_individual?.toLocaleString('pt-BR')}
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
              value={participanteData.numero_cotas}
              onChange={(e) => setParticipanteData({ ...participanteData, numero_cotas: parseFloat(e.target.value) })}
              inputProps={{ min: 0.5, max: 3, step: 0.5 }}
              helperText="De 0.5 a 3.0 cotas"
            />

            <TextField
              label="Montante Individual"
              value={participanteData.montante_individual}
              onChange={(e) => setParticipanteData({ ...participanteData, montante_individual: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />
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