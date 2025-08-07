import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  Business,
  People,
  CheckCircle,
  Person,
} from '@mui/icons-material';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    async () => {
      const response = await api.get('/consorcios/dashboard');
      return response.data;
    },
    {
      refetchInterval: 30000,
    }
  );

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        '&:hover': onClick ? { transform: 'translateY(-2px)' } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: color, mr: 2 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
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
        Erro ao carregar dados do dashboard. Tente novamente.
      </Alert>
    );
  }

  const { estatisticas, consorciosRecentes } = dashboardData;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visão geral dos seus consórcios e participantes
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Consórcios Ativos"
            value={estatisticas.consorciosAtivos}
            icon={<TrendingUp />}
            color="primary.main"
            onClick={() => navigate('/consorcios?status=ativo')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Consórcios Fechados"
            value={estatisticas.consorciosFechados}
            icon={<CheckCircle />}
            color="success.main"
            onClick={() => navigate('/consorcios?status=fechado')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total de Participantes"
            value={estatisticas.totalParticipantes}
            icon={<People />}
            color="secondary.main"
            onClick={() => navigate('/participantes')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Consórcios Recentes
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate('/consorcios')}
                >
                  Ver Todos
                </Button>
              </Box>
              
              {consorciosRecentes?.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  Nenhum consórcio encontrado
                </Typography>
              ) : (
                <List>
                  {consorciosRecentes?.map((consorcio, index) => (
                    <ListItem 
                      key={consorcio.id}
                      divider={index < consorciosRecentes.length - 1}
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
                              Valor: R$ {consorcio.montante_total?.toLocaleString('pt-BR')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Participantes: {consorcio.participantes?.length || 0}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Ações Rápidas
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button 
                  variant="contained" 
                  startIcon={<Business />}
                  onClick={() => navigate('/consorcios')}
                  fullWidth
                >
                  Criar Novo Consórcio
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<Person />}
                  onClick={() => navigate('/participantes')}
                  fullWidth
                >
                  Adicionar Participante
                </Button>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resumo Geral
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de consórcios: {(estatisticas.consorciosAtivos + estatisticas.consorciosFechados)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Participantes ativos: {estatisticas.totalParticipantes}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;