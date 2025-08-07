# Consórcio Manager

Uma aplicação completa para gestão de consórcios, desenvolvida com React + Material UI no frontend e Express + MySQL no backend.

## 🚀 Características

- **Autenticação JWT** - Sistema de login seguro para gestores
- **Dashboard Completo** - Visão geral dos consórcios ativos e fechados
- **Gestão de Participantes** - CRUD completo para participantes
- **Gestão de Consórcios** - CRUD completo para consórcios
- **Sistema de Cotas** - Participantes podem ter de 0.5 a 3.0 cotas
- **Interface Responsiva** - Design moderno com Material UI
- **Validação de Dados** - Validação tanto no frontend quanto no backend

## 🛠 Tecnologias Utilizadas

### Backend
- **Node.js** com Express
- **MySQL** como banco de dados
- **Sequelize** como ORM
- **JWT** para autenticação
- **Bcrypt** para hash de senhas
- **Joi** para validação de dados

### Frontend
- **React** com Vite
- **Material UI** para componentes
- **React Query** para gerenciamento de estado
- **React Router** para navegação
- **Axios** para requisições HTTP

## 📋 Pré-requisitos

- Node.js 16+ 
- MySQL 8.0+
- npm ou yarn

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd ConsorcioManager
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Copie o arquivo `.env.example` para `.env` e configure suas variáveis:

```bash
cp .env.example .env
```

Configure as variáveis no arquivo `.env`:
```env
PORT=5000
DB_NAME=consorcio_manager
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_HOST=localhost
JWT_SECRET=sua_chave_secreta_super_forte_aqui
```

### 3. Configure o Banco de Dados

Crie o banco de dados MySQL:
```sql
CREATE DATABASE consorcio_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Inicialize as tabelas:
```bash
node scripts/initDatabase.js
```

### 4. Configure o Frontend

```bash
cd ../frontend
npm install
```

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

## 🚀 Executando a Aplicação

### Backend
```bash
cd backend
npm run dev
```
Servidor rodará em: http://localhost:5000

### Frontend
```bash
cd frontend
npm run dev
```
Aplicação rodará em: http://localhost:3000

## 📱 Funcionalidades

### Gestores
- ✅ Registro e login de gestores
- ✅ Perfil do gestor
- ✅ Dashboard com estatísticas

### Participantes
- ✅ Cadastro de participantes
- ✅ Lista com busca e paginação
- ✅ Edição e exclusão
- ✅ Visualização de detalhes
- ✅ PIX/IBAN para pagamentos

### Consórcios
- ✅ Criação de consórcios
- ✅ Lista com filtros por status
- ✅ Edição e exclusão
- ✅ Visualização de detalhes
- ✅ Adição/remoção de participantes
- ✅ Sistema de cotas (0.5 a 3.0)

## 🏗 Estrutura do Projeto

```
ConsorcioManager/
├── backend/
│   ├── config/         # Configurações do banco
│   ├── models/         # Modelos Sequelize
│   ├── routes/         # Rotas da API
│   ├── middleware/     # Middlewares
│   ├── scripts/        # Scripts utilitários
│   └── server.js       # Servidor principal
├── frontend/
│   ├── src/
│   │   ├── components/ # Componentes React
│   │   ├── pages/      # Páginas da aplicação
│   │   ├── contexts/   # Context providers
│   │   └── services/   # Serviços da API
│   └── public/         # Arquivos estáticos
└── README.md
```

## 🔐 Segurança

- Senhas hashadas com bcrypt
- Autenticação JWT
- Validação de dados no backend
- Rate limiting
- Helmet para headers de segurança
- CORS configurado

## 📊 Banco de Dados

### Tabelas Principais:
- **gestores** - Dados dos gestores
- **participantes** - Dados dos participantes
- **consorcios** - Dados dos consórcios
- **consorcio_participantes** - Relação many-to-many

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se você encontrar algum problema, por favor abra uma issue no repositório.

---

⭐ Se este projeto foi útil para você, considere dar uma estrela!