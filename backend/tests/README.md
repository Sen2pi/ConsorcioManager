# Testes da API - Consórcio Manager

Este diretório contém todos os testes da API do backend do sistema de gestão de consórcios.

## Estrutura dos Testes

```
tests/
├── setup.js              # Configuração do banco de dados de teste
├── helpers.js            # Funções utilitárias para testes
├── auth.test.js          # Testes de autenticação
├── gestores.test.js      # Testes de gestores
├── participantes.test.js  # Testes de participantes
├── consorcios.test.js    # Testes de consórcios
├── integration.test.js    # Testes de integração
└── README.md             # Esta documentação
```

## Como Executar os Testes

### Pré-requisitos

1. Certifique-se de que o MySQL está rodando
2. Crie um banco de dados de teste:
   ```sql
   CREATE DATABASE consorcio_manager_test;
   ```

### Executar todos os testes

```bash
npm test
```

### Executar testes específicos

```bash
# Testes de autenticação
npm test -- auth.test.js

# Testes de participantes
npm test -- participantes.test.js

# Testes de consórcios
npm test -- consorcios.test.js

# Testes de integração
npm test -- integration.test.js
```

### Executar com cobertura

```bash
npm run test:coverage
```

### Executar em modo watch

```bash
npm run test:watch
```

## Tipos de Testes

### 1. Testes Unitários

- **auth.test.js**: Testa todas as rotas de autenticação (login, registro, perfil)
- **gestores.test.js**: Testa operações de perfil do gestor
- **participantes.test.js**: Testa CRUD completo de participantes
- **consorcios.test.js**: Testa CRUD completo de consórcios e associações

### 2. Testes de Integração

- **integration.test.js**: Testa fluxos completos e cenários complexos

## Cobertura de Testes

Os testes cobrem:

### Autenticação
- ✅ Login com credenciais válidas
- ✅ Login com credenciais inválidas
- ✅ Registro de novos gestores
- ✅ Validação de dados de entrada
- ✅ Verificação de perfil autenticado
- ✅ Tratamento de tokens inválidos

### Gestores
- ✅ Visualização de perfil
- ✅ Atualização de dados pessoais
- ✅ Atualização de senha
- ✅ Desativação de conta
- ✅ Validação de dados

### Participantes
- ✅ Listagem com paginação e busca
- ✅ Criação de participantes
- ✅ Atualização de dados
- ✅ Remoção (desativação)
- ✅ Validação de dados únicos (telefone)
- ✅ Isolamento entre gestores

### Consórcios
- ✅ Listagem com filtros e paginação
- ✅ Criação de consórcios
- ✅ Atualização de status e dados
- ✅ Remoção de consórcios
- ✅ Adição de participantes
- ✅ Remoção de participantes
- ✅ Dashboard com estatísticas
- ✅ Validação de regras de negócio

### Integração
- ✅ Fluxo completo de gestão
- ✅ Isolamento entre gestores
- ✅ Cenários de erro complexos
- ✅ Paginação e filtros
- ✅ Operações de atualização e remoção

## Helpers e Utilitários

### setup.js
- Configuração do banco de dados de teste
- Limpeza de dados entre testes
- Fechamento de conexões

### helpers.js
- Funções para criar dados de teste
- Validação de respostas padrão
- Geração de tokens JWT
- Criação de entidades de teste

## Variáveis de Ambiente para Testes

Crie um arquivo `.env.test` com:

```env
DB_NAME=consorcio_manager_test
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=test-secret-key-for-testing-only
JWT_EXPIRES_IN=1h
NODE_ENV=test
PORT=5001
```

## Boas Práticas Seguidas

1. **Isolamento**: Cada teste é independente
2. **Limpeza**: Dados são limpos entre testes
3. **Validação**: Testes verificam tanto sucesso quanto erro
4. **Cobertura**: Todos os endpoints são testados
5. **Integração**: Testes de fluxos completos
6. **Segurança**: Testes de autenticação e autorização
7. **Validação**: Testes de regras de negócio

## Comandos NPM

Adicione ao `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

## Relatórios de Cobertura

Após executar `npm run test:coverage`, você encontrará:

- Relatório HTML em `coverage/lcov-report/index.html`
- Relatório de texto no terminal
- Arquivo LCOV em `coverage/lcov.info`

## Troubleshooting

### Erro de conexão com banco
- Verifique se o MySQL está rodando
- Confirme as credenciais no `.env.test`
- Certifique-se de que o banco de teste existe

### Timeout nos testes
- Aumente o `testTimeout` no `jest.config.js`
- Verifique se não há operações bloqueantes

### Falhas intermitentes
- Execute `npm run test:ci` para testes mais estáveis
- Verifique se há conflitos de dados entre testes
