import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import ConsorcioForm from '../components/ConsorcioForm';
import api from '../services/api';

const EditarConsorcio = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(
    ['consorcio', id],
    async () => {
      const response = await api.get(`/consorcios/${id}`);
      return response.data;
    }
  );

  const handleSuccess = () => {
    navigate(`/consorcios/${id}`);
  };

  const handleCancel = () => {
    navigate(`/consorcios/${id}`);
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
        <IconButton onClick={handleCancel} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          Editar Consórcio: {consorcio.nome}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <ConsorcioForm
            consorcio={consorcio}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default EditarConsorcio;