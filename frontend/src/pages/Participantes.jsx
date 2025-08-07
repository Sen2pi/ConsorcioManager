import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
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
  CircularProgress,
  Alert,
  Chip,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  Phone,
  Business,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import ParticipanteForm from '../components/ParticipanteForm';

const Participantes = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openForm, setOpenForm] = useState(false);
  const [editingParticipante, setEditingParticipante] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['participantes', { page: page + 1, limit: rowsPerPage, search }],
    async () => {
      const response = await api.get('/participantes', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search,
        },
      });
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`/participantes/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('participantes');
        enqueueSnackbar('Participante removido com sucesso!', { variant: 'success' });
        setDeleteConfirm(null);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao remover participante',
          { variant: 'error' }
        );
      },
    }
  );

  const handleEdit = (participante) => {
    setEditingParticipante(participante);
    setOpenForm(true);
  };

  const handleDelete = (participante) => {
    setDeleteConfirm(participante);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const handleFormClose = () => {
    setOpenForm(false);
    setEditingParticipante(null);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries('participantes');
    handleFormClose();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
  };

  if (error) {
    return (
      <Alert severity="error">
        Erro ao carregar participantes. Tente novamente.
      </Alert>
    );
  }

  const participantes = data?.participantes || [];
  const pagination = data?.pagination || { total: 0, pages: 0 };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Participantes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenForm(true)}
        >
          Novo Participante
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Buscar participantes por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="outlined">
              Buscar
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>PIX/IBAN</TableCell>
                <TableCell>Consórcios</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : participantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhum participante encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                participantes.map((participante) => (
                  <TableRow 
                    key={participante.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/participantes/${participante.id}`)}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">
                        {participante.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        {participante.telefone}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}>
                        {participante.pix_iban}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {participante.consorcios?.slice(0, 2).map((consorcio) => (
                          <Chip
                            key={consorcio.id}
                            label={consorcio.nome}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {participante.consorcios?.length > 2 && (
                          <Chip
                            label={`+${participante.consorcios.length - 2}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {participante.consorcios?.length === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Nenhum consórcio
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(participante);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(participante);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Linhas por página:"
        />
      </Card>

      <Dialog 
        open={openForm} 
        onClose={handleFormClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingParticipante ? 'Editar Participante' : 'Novo Participante'}
        </DialogTitle>
        <DialogContent>
          <ParticipanteForm
            participante={editingParticipante}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover o participante "{deleteConfirm?.nome}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Participantes;