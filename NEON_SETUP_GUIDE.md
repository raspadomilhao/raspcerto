# 🎰 Guia de Setup - Raspmania com Neon Database

Este guia te ajudará a configurar o banco de dados Neon para o projeto Raspmania.

## ✅ Configurações Atuais

- **Base URL:** https://v0-raspmania.vercel.app
- **JWT Secret:** raspadinhapremiada05072025
- **Webhook URL:** https://v0-raspmania.vercel.app/api/webhook/horsepay

## 🚀 Passo a Passo

### 1. Acesse o Neon
- Vá para [neon.tech](https://neon.tech)
- Faça login ou crie uma conta

### 2. Crie um Projeto
- Clique em "New Project"
- Escolha um nome (ex: "raspmania")
- Selecione a região mais próxima

### 3. Obtenha a Connection String
- Na dashboard do projeto, vá para "Connection Details"
- Copie a **DATABASE_URL** (formato: `postgresql://...`)

### 4. Configure no Vercel
- Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
- Selecione seu projeto
- Vá em **Settings → Environment Variables**
- Adicione:
  \`\`\`
  DATABASE_URL=sua_connection_string_aqui
  JWT_SECRET=raspadinhapremiada05072025
  NEXT_PUBLIC_BASE_URL=https://v0-raspmania.vercel.app
  \`\`\`

### 5. Execute o Setup
Você tem duas opções:

#### Opção A: Automático (Recomendado)
1. Acesse `/setup-database` no seu projeto
2. Clique em "Executar Setup"
3. Aguarde a confirmação

#### Opção B: Manual
1. Acesse o console SQL do Neon
2. Execute o script SQL da aba "Script SQL"

## 📊 Verificação

Após o setup, você deve ter:

- ✅ 5 tabelas criadas (users, wallets, transactions, games, webhook_logs)
- ✅ 7 índices para performance
- ✅ 2 usuários padrão:
  - **Admin:** admin@raspmania.com / admin123 (R$ 100.000)
  - **Blogger:** blogger@raspmania.com / blogger123 (R$ 999.999)

## 🎮 Estrutura do Banco

### Tabelas Principais:
- **users** - Usuários do sistema
- **wallets** - Carteiras/saldos dos usuários
- **transactions** - Histórico de transações
- **games** - Histórico de jogos
- **webhook_logs** - Logs dos webhooks de pagamento

### Tipos de Usuário:
- **regular** - Usuário comum
- **blogger** - Influenciador (saldos altos para testes)
- **admin** - Administrador do sistema

## 🔧 Troubleshooting

### Erro de Conexão
- Verifique se a DATABASE_URL está correta
- Confirme que o banco Neon está ativo
- Teste a conexão na aba "Status"

### Tabelas não Criadas
- Execute o script SQL manualmente no console Neon
- Verifique permissões do usuário do banco
- Tente o setup automático novamente

### Usuários Padrão não Funcionam
- Confirme que o JWT_SECRET está configurado
- Verifique se as senhas estão corretas (admin123, blogger123)
- Teste o login na página `/auth`

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no console do navegador
2. Teste a conexão na página `/setup-database`
3. Confirme todas as variáveis de ambiente

---

**Projeto:** Raspmania - Sistema de Raspadinhas Online  
**Versão:** 1.0  
**Última atualização:** Janeiro 2025
