-- Adicionar campo user_type na tabela users se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_type') THEN
        ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'regular';
    END IF;
END $$;

-- Adicionar campo is_demo na tabela transactions se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'is_demo') THEN
        ALTER TABLE transactions ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_transactions_is_demo ON transactions(is_demo);

-- Atualizar usuários existentes para ter user_type 'regular'
UPDATE users SET user_type = 'regular' WHERE user_type IS NULL;

-- Inserir usuário blogueiro de teste com hash correto da senha "123456"
INSERT INTO users (email, name, username, phone, password_hash, user_type, created_at, updated_at)
VALUES (
  'blogueiro@teste.com',
  'Blogueiro Teste',
  'blogueiro_teste',
  '(11) 99999-9999',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj0kPakxn.Fy',
  'blogger',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  user_type = 'blogger',
  password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj0kPakxn.Fy';

-- Criar carteira para o blogueiro com saldo alto
INSERT INTO wallets (user_id, balance, created_at, updated_at)
SELECT 
  u.id,
  999999.99,
  NOW(),
  NOW()
FROM users u
WHERE u.email = 'blogueiro@teste.com'
ON CONFLICT (user_id) DO UPDATE SET balance = 999999.99;

COMMIT;
