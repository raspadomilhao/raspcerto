-- Adicionar campos que podem estar faltando na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Criar índice para username se não existir
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
