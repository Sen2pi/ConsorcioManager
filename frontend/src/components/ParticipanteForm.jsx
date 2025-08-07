import React, { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import {
  Box,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const ParticipanteForm = ({ participante, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    pix_iban: '',
  });
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (participante) {
      setFormData({
        nome: participante.nome || '',
        telefone: participante.telefone || '',
        pix_iban: participante.pix_iban || '',
      });
    }
  }, [participante]);

  const mutation = useMutation(
    async (data) => {
      if (participante?.id) {
        return await api.put(`/participantes/${participante.id}`, data);
      } else {
        return await api.post('/participantes', data);
      }
    },
    {
      onSuccess: () => {
        enqueueSnackbar(
          participante ? 'Participante atualizado com sucesso!' : 'Participante criado com sucesso!',
          { variant: 'success' }
        );
        onSuccess();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Erro ao salvar participante';
        setError(message);
        enqueueSnackbar(message, { variant: 'error' });
      },
    }
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    
    if (!formData.telefone.trim()) {
      setError('Telefone é obrigatório');
      return;
    }
    
    if (!formData.pix_iban.trim()) {
      setError('PIX/IBAN é obrigatório');
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="nome"
        label="Nome Completo"
        name="nome"
        autoFocus
        value={formData.nome}
        onChange={handleChange}
        error={!formData.nome.trim() && mutation.isError}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        id="telefone"
        label="Telefone"
        name="telefone"
        type="tel"
        value={formData.telefone}
        onChange={handleChange}
        placeholder="+5511999999999"
        helperText="Incluir código do país e área"
        error={!formData.telefone.trim() && mutation.isError}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        id="pix_iban"
        label="PIX ou IBAN"
        name="pix_iban"
        value={formData.pix_iban}
        onChange={handleChange}
        multiline
        rows={2}
        helperText="Chave PIX ou número IBAN para pagamentos"
        error={!formData.pix_iban.trim() && mutation.isError}
      />

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          onClick={onCancel}
          fullWidth
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={mutation.isLoading}
        >
          {mutation.isLoading 
            ? (participante ? 'Atualizando...' : 'Criando...') 
            : (participante ? 'Atualizar' : 'Criar')
          }
        </Button>
      </Box>
    </Box>
  );
};

export default ParticipanteForm;