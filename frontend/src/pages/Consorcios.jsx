import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  Visibility,
  People,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import ConsorcioForm from '../components/ConsorcioForm';

const Consorcios = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openForm, setOpenForm] = useState(false);
  const [editingConsorcio, setEditingConsorcio] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatus(statusParam);
    }
  }, [searchParams]);

  const { data, isLoading, error } = useQuery(
    ['consorcios', { page: page + 1, limit: rowsPerPage, search, status }],
    async () => {
      const response = await api.get('/consorcios', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search,
          status: status === 'all' ? undefined : status,
        },
      });
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`/consorcios/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('consorcios');
        enqueueSnackbar('Consórcio removido com sucesso!', { variant: 'success' });
        setDeleteConfirm(null);
      },
      onError: (error) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Erro ao remover consórcio',
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

  const handleEdit = (consorcio) => {
    setEditingConsorcio(consorcio);
    setOpenForm(true);
  };

  const handleDelete = (consorcio) => {
    setDeleteConfirm(consorcio);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const handleFormClose = () => {
    setOpenForm(false);
    setEditingConsorcio(null);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries('consorcios');
    handleFormClose();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
  };

  if (error) {
    return (
      <Alert severity="error">
        Erro ao carregar consórcios. Tente novamente.
      </Alert>
    );
  }

  const consorcios = data?.consorcios || [];
  const pagination = data?.pagination || { total: 0, pages: 0 };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Consórcios
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenForm(true)}
        >
          Novo Consórcio
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 2, alignItems: 'end' }}>
            <TextField
              fullWidth
              placeholder="Buscar consórcios por nome..."
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
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                  if (e.target.value === 'all') {
                    searchParams.delete('status');
                  } else {
                    searchParams.set('status', e.target.value);
                  }
                  setSearchParams(searchParams);
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="fechado">Fechado</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
            
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
                <TableCell>Valor Total</TableCell>
                <TableCell>Prazo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Participantes</TableCell>
                <TableCell>Data Início</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : consorcios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhum consórcio encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                consorcios.map((consorcio) => (
                  <TableRow 
                    key={consorcio.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/consorcios/${consorcio.id}`)}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">
                        {consorcio.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        R$ {consorcio.montante_total?.toLocaleString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {consorcio.prazo_meses} meses
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={consorcio.status}
                        color={getStatusColor(consorcio.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <People fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        {consorcio.participantes?.length || 0}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(consorcio.data_inicio).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/consorcios/${consorcio.id}`);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(consorcio);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(consorcio);
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingConsorcio ? 'Editar Consórcio' : 'Novo Consórcio'}
        </DialogTitle>
        <DialogContent>
          <ConsorcioForm
            consorcio={editingConsorcio}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover o consórcio "{deleteConfirm?.nome}"?
            Esta ação não pode ser desfeita e removerá todos os participantes associados.
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

export default Consorcios;