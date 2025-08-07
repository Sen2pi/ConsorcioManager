import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
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
} from '@mui/material';
import {
  ArrowBack,
  Phone,
  AccountBalance,
  Business,
} from '@mui/icons-material';
import api from '../services/api';

const ParticipanteDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(
    ['participante', id],
    async () => {
      const response = await api.get(`/participantes/${id}`);
      return response.data;
    }
  );

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
        Erro ao carregar dados do participante. Tente novamente.
      </Alert>
    );
  }

  const participante = data?.participante;

  if (!participante) {
    return (
      <Alert severity="warning">
        Participante não encontrado.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/participantes')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          {participante.nome}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações Pessoais
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Phone sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Telefone
                    </Typography>
                    <Typography variant="body1">
                      {participante.telefone}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccountBalance sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      PIX/IBAN
                    </Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                      {participante.pix_iban}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Cadastrado em
                </Typography>
                <Typography variant="body1">
                  {new Date(participante.createdAt).toLocaleDateString('pt-BR')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consórcios Participando
              </Typography>
              
              {participante.consorcios?.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  Este participante não está em nenhum consórcio
                </Typography>
              ) : (
                <List>
                  {participante.consorcios?.map((consorcio, index) => (
                    <React.Fragment key={consorcio.id}>
                      <ListItem 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                        onClick={() => navigate(`/consorcios/${consorcio.id}`)}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1">
                                {consorcio.nome}
                              </Typography>
                              <Chip
                                label={consorcio.status}
                                color={consorcio.status === 'ativo' ? 'primary' : 'default'}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Cotas: {consorcio.ConsorcioParticipante?.numero_cotas}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Valor: R$ {consorcio.ConsorcioParticipante?.montante_individual?.toLocaleString('pt-BR')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Entrada: {new Date(consorcio.ConsorcioParticipante?.data_entrada).toLocaleDateString('pt-BR')}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < participante.consorcios.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/participantes')}
        >
          Voltar para Lista
        </Button>
        <Button 
          variant="contained"
          onClick={() => navigate(`/participantes`)}
        >
          Editar Participante
        </Button>
      </Box>
    </Box>
  );
};

export default ParticipanteDetalhes;