-- Script para criar as tabelas principais do sistema
-- Execute este script no seu banco Neon conectado

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    user_type VARCHAR(20) DEFAULT 'regular' CHECK (user_type IN ('regular', 'blogger', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de carteiras
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'game_win', 'game_loss')),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
    external_id INTEGER,
    end_to_end_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de jogos
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(10,2) NOT NULL,
    prize_amount DECIMAL(10,2) DEFAULT 0.00,
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de logs de webhook
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    external_id INTEGER,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_external_id ON webhook_logs(external_id);

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO users (email, name, username, phone, password_hash, user_type)
VALUES (
    'admin@raspmania.com',
    'Administrador',
    'admin',
    '11999999999',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9PS', -- admin123
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Inserir usuário blogger de teste (senha: blogger123)
INSERT INTO users (email, name, username, phone, password_hash, user_type)
VALUES (
    'blogger@raspmania.com',
    'Blogger Teste',
    'blogger',
    '11888888888',
    '$2a$12$8HqAPvnn.6fwxIjyoQ8hUOQb5QjJ5VJeOp7.VC6nt6pMjxn8OyKaS', -- blogger123
    'blogger'
) ON CONFLICT (email) DO NOTHING;

-- Criar carteiras para os usuários padrão
INSERT INTO wallets (user_id, balance)
SELECT id, CASE 
    WHEN user_type = 'blogger' THEN 999999.99
    WHEN user_type = 'admin' THEN 100000.00
    ELSE 0.00
END
FROM users
WHERE email IN ('admin@raspmania.com', 'blogger@raspmania.com')
ON CONFLICT (user_id) DO NOTHING;

-- Inserir alguns dados de exemplo para vencedores
INSERT INTO games (user_id, game_type, bet_amount, prize_amount, is_winner, created_at)
SELECT 
    u.id,
    'raspe-da-esperanca',
    1.00,
    CASE 
        WHEN random() < 0.3 THEN (random() * 100 + 10)::DECIMAL(10,2)
        ELSE 0.00
    END,
    CASE 
        WHEN random() < 0.3 THEN TRUE
        ELSE FALSE
    END,
    NOW() - (random() * INTERVAL '30 days')
FROM users u
WHERE u.user_type = 'blogger'
LIMIT 10
ON CONFLICT DO NOTHING;

COMMIT;
