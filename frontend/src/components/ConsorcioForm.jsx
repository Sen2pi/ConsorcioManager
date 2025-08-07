import React, { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import {
  Box,
  TextField,
  Button,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const ConsorcioForm = ({ consorcio, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    nome: '',
    montante_total: '',
    prazo_meses: '',
    numero_cotas: '',
    taxa_gestor: 0.00,
    acrescimo_mensal: 0.00,
    status: 'ativo',
    data_inicio: dayjs(),
    data_fim: null,
    descricao: '',
  });
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (consorcio) {
      setFormData({
        nome: consorcio.nome || '',
        montante_total: consorcio.montante_total || '',
        prazo_meses: consorcio.prazo_meses || '',
        numero_cotas: consorcio.numero_cotas || '',
        taxa_gestor: consorcio.taxa_gestor || 0.00,
        acrescimo_mensal: consorcio.acrescimo_mensal || 0.00,
        status: consorcio.status || 'ativo',
        data_inicio: consorcio.data_inicio ? dayjs(consorcio.data_inicio) : dayjs(),
        data_fim: consorcio.data_fim ? dayjs(consorcio.data_fim) : null,
        descricao: consorcio.descricao || '',
      });
    }
  }, [consorcio]);

  const mutation = useMutation(
    async (data) => {
      const submitData = {
        ...data,
        montante_total: parseFloat(data.montante_total),
        prazo_meses: parseInt(data.prazo_meses),
        numero_cotas: parseInt(data.numero_cotas),
        taxa_gestor: parseFloat(data.taxa_gestor),
        acrescimo_mensal: parseFloat(data.acrescimo_mensal),
        data_inicio: data.data_inicio.format('YYYY-MM-DD'),
        data_fim: data.data_fim ? data.data_fim.format('YYYY-MM-DD') : null,
      };

      if (consorcio?.id) {
        return await api.put(`/consorcios/${consorcio.id}`, submitData);
      } else {
        return await api.post('/consorcios', submitData);
      }
    },
    {
      onSuccess: () => {
        enqueueSnackbar(
          consorcio ? 'Consórcio atualizado com sucesso!' : 'Consórcio criado com sucesso!',
          { variant: 'success' }
        );
        onSuccess();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Erro ao salvar consórcio';
        setError(message);
        enqueueSnackbar(message, { variant: 'error' });
      },
    }
  );

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    
    // Calcular data de fim automaticamente baseada no prazo
    if (field === 'prazo_meses' && value && newFormData.data_inicio) {
      const dataFim = newFormData.data_inicio.add(parseInt(value), 'month');
      newFormData.data_fim = dataFim;
    }
    
    // Calcular data de fim se data_inicio mudar e prazo_meses existir
    if (field === 'data_inicio' && value && newFormData.prazo_meses) {
      const dataFim = value.add(parseInt(newFormData.prazo_meses), 'month');
      newFormData.data_fim = dataFim;
    }
    
    // Definir número de cotas igual ao prazo em meses
    if (field === 'prazo_meses' && value) {
      newFormData.numero_cotas = value;
    }
    
    setFormData(newFormData);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    
    if (formData.montante_total === '' || formData.montante_total < 0) {
      setError('Montante total deve ser maior ou igual a zero');
      return;
    }
    
    if (!formData.prazo_meses || parseInt(formData.prazo_meses) <= 0) {
      setError('Prazo deve ser maior que zero');
      return;
    }
    
    if (!formData.numero_cotas || parseInt(formData.numero_cotas) <= 0) {
      setError('Número de cotas deve ser maior que zero');
      return;
    }

    if (!formData.data_inicio) {
      setError('Data de início é obrigatória');
      return;
    }

    mutation.mutate(formData);
  };

  const formatCurrency = (value) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR');
  };

  const handleCurrencyChange = (e) => {
    const formatted = formatCurrency(e.target.value);
    const numericValue = parseFloat(e.target.value.replace(/\D/g, '')) / 100;
    setFormData({ ...formData, montante_total: numericValue || '' });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="nome"
              label="Nome do Consórcio"
              value={formData.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              error={!formData.nome.trim() && mutation.isError}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              id="montante_total"
              label="Montante Total"
              value={formData.montante_total !== '' ? formData.montante_total.toLocaleString('pt-BR') : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value === '') {
                  handleChange('montante_total', '');
                } else {
                  const numericValue = parseFloat(value);
                  handleChange('montante_total', numericValue);
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              error={!formData.montante_total && mutation.isError}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              id="prazo_meses"
              label="Prazo em Meses"
              type="number"
              value={formData.prazo_meses}
              onChange={(e) => handleChange('prazo_meses', e.target.value)}
              inputProps={{ min: 1, max: 120 }}
              error={!formData.prazo_meses && mutation.isError}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              id="numero_cotas"
              label="Número de Cotas"
              type="number"
              value={formData.numero_cotas}
              onChange={(e) => handleChange('numero_cotas', e.target.value)}
              inputProps={{ min: 1 }}
              error={!formData.numero_cotas && mutation.isError}
              helperText="Automaticamente igual ao prazo em meses"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="taxa_gestor"
              label="Taxa do Gestor (Mensal)"
              type="number"
              value={formData.taxa_gestor !== '' ? formData.taxa_gestor : ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  handleChange('taxa_gestor', '');
                } else {
                  const numericValue = parseFloat(value);
                  if (!isNaN(numericValue)) {
                    handleChange('taxa_gestor', numericValue);
                  }
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              inputProps={{
                min: 0,
                step: 0.01
              }}
              helperText="Taxa mensal do gestor em reais"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="acrescimo_mensal"
              label="Acréscimo Mensal"
              type="number"
              value={formData.acrescimo_mensal !== '' ? formData.acrescimo_mensal : ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  handleChange('acrescimo_mensal', '');
                } else {
                  const numericValue = parseFloat(value);
                  if (!isNaN(numericValue)) {
                    handleChange('acrescimo_mensal', numericValue);
                  }
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              inputProps={{
                min: 0,
                step: 0.01
              }}
              helperText="Valor adicional mensal para todos os participantes"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                value={formData.status}
                label="Status"
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="fechado">Fechado</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Data de Início"
              value={formData.data_inicio}
              onChange={(newValue) => handleChange('data_inicio', newValue)}
              renderInput={(params) => <TextField {...params} fullWidth required />}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Data de Fim"
              value={formData.data_fim}
              onChange={(newValue) => handleChange('data_fim', newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
              helperText="Calculada automaticamente baseada no prazo"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              id="descricao"
              label="Descrição (opcional)"
              multiline
              rows={3}
              value={formData.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
            />
          </Grid>
        </Grid>

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
              ? (consorcio ? 'Atualizando...' : 'Criando...') 
              : (consorcio ? 'Atualizar' : 'Criar')
            }
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default ConsorcioForm;