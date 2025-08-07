#!/bin/bash

# Script para executar testes da API
echo "🧪 Iniciando testes da API Consórcio Manager..."

# Verificar se o MySQL está rodando
echo "🔍 Verificando conexão com MySQL..."
if ! mysql -u root -proot -e "SELECT 1" > /dev/null 2>&1; then
    echo "❌ MySQL não está rodando ou credenciais incorretas. Verifique se o MySQL está rodando e a senha está correta."
    exit 1
fi

# Criar banco de dados de teste se não existir
echo "🗄️ Verificando banco de dados de teste..."
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS consorcio_manager_test;" > /dev/null 2>&1

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Executar testes
echo "🚀 Executando testes..."
npm test

echo "✅ Testes concluídos!"
