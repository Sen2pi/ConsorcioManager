<div align="center">
  <img src="logo.png" alt="Consórcio Gestão" width="200" height="200" />
  
  # Consórcio Manager
  
  [![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB.svg?logo=react)](https://reactjs.org/)
  [![Made with Express](https://img.shields.io/badge/Made%20with-Express-000000.svg?logo=express)](https://expressjs.com/)
  [![Database](https://img.shields.io/badge/Database-MySQL-4479A1.svg?logo=mysql&logoColor=white)](https://mysql.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Node Version](https://img.shields.io/badge/Node-16+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Tests](https://img.shields.io/badge/Tests-Jest-C21325.svg?logo=jest)](https://jestjs.io/)
  
  Uma aplicação completa para gestão de consórcios, desenvolvida com React + Material UI no frontend e Express + MySQL no backend.
  
  [Demo](#) • [Documentação](#) • [Reportar Bug](../../issues) • [Solicitar Feature](../../issues)
  
</div>

---

## 🚀 Características

- **Autenticação JWT** - Sistema de login seguro para gestores
- **Dashboard Completo** - Visão geral dos consórcios ativos e fechados
- **Gestão de Participantes** - CRUD completo para participantes
- **Gestão de Consórcios** - CRUD completo para consórcios
- **Sistema de Cotas** - Participantes podem ter de 0.5 a 3.0 cotas
- **Interface Responsiva** - Design moderno com Material UI
- **Validação de Dados** - Validação tanto no frontend quanto no backend

## 🛠 Stack Tecnológico

<table>
  <tr>
    <th>Frontend</th>
    <th>Backend</th>
    <th>Database</th>
    <th>DevOps</th>
  </tr>
  <tr>
    <td>
      <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" /><br>
      <img src="https://img.shields.io/badge/Material--UI-5-007FFF?logo=mui&logoColor=white" alt="MUI" /><br>
      <img src="https://img.shields.io/badge/Vite-4-646CFF?logo=vite&logoColor=white" alt="Vite" /><br>
      <img src="https://img.shields.io/badge/React_Query-3-FF4154?logo=reactquery&logoColor=white" alt="React Query" />
    </td>
    <td>
      <img src="https://img.shields.io/badge/Node.js-16+-339933?logo=node.js&logoColor=white" alt="Node.js" /><br>
      <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express" /><br>
      <img src="https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white" alt="JWT" /><br>
      <img src="https://img.shields.io/badge/Bcrypt-Security-CA4245?logo=letsencrypt&logoColor=white" alt="Bcrypt" />
    </td>
    <td>
      <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" alt="MySQL" /><br>
      <img src="https://img.shields.io/badge/Sequelize-6-52B0E7?logo=sequelize&logoColor=white" alt="Sequelize" />
    </td>
    <td>
      <img src="https://img.shields.io/badge/Jest-Testing-C21325?logo=jest&logoColor=white" alt="Jest" /><br>
      <img src="https://img.shields.io/badge/Git-Version_Control-F05032?logo=git&logoColor=white" alt="Git" />
    </td>
  </tr>
</table>

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

## 🚀 Quick Start

### 🏃‍♂️ Executar em modo desenvolvimento

#### Terminal 1 - Backend
```bash
cd backend
npm install
npm run dev
```
🌐 **Backend**: http://localhost:5000

#### Terminal 2 - Frontend  
```bash
cd frontend
npm install
npm run dev
```
🎨 **Frontend**: http://localhost:3000

### 📦 Scripts Disponíveis

#### Backend
```bash
npm start          # Produção
npm run dev        # Desenvolvimento com nodemon
npm test           # Executar testes
npm run test:watch # Testes em modo watch
npm run init-db    # Inicializar banco de dados
```

#### Frontend
```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build para produção
npm run preview    # Preview do build
```

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

<div align="center">
  
  ### ⭐ Se este projeto foi útil, considere dar uma estrela!
  
  <a href="#top">🔝 Voltar ao topo</a>
  
  ---
  
  **Feito com ❤️ para gestão de consórcios**
  
  ![Visitors](https://visitor-badge.laobi.icu/badge?page_id=consorcio-manager.readme)
  [![GitHub forks](https://img.shields.io/github/forks/username/ConsorcioManager?style=social)](../../network/members)
  [![GitHub stars](https://img.shields.io/github/stars/username/ConsorcioManager?style=social)](../../stargazers)
  
</div>