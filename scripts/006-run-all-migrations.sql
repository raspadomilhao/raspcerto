-- Script para executar todas as migrações em ordem
-- Execute este script no console SQL do Neon

-- 1. Criar tabelas
\i 001-create-tables.sql

-- 2. Popular dados iniciais
\i 002-seed-data.sql

-- 3. Adicionar campos de usuário (se necessário)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 4. Verificar tipos de transação
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%transactions_type_check%'
        AND check_clause LIKE '%game_play%'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
        CHECK (type IN ('deposit', 'withdraw', 'game_play', 'game_prize'));
    END IF;
END $$;

-- 5. Verificar se tudo foi criado corretamente
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'wallets' as table_name, 
    COUNT(*) as record_count 
FROM wallets
UNION ALL
SELECT 
    'transactions' as table_name, 
    COUNT(*) as record_count 
FROM transactions
UNION ALL
SELECT 
    'webhook_logs' as table_name, 
    COUNT(*) as record_count 
FROM webhook_logs;
