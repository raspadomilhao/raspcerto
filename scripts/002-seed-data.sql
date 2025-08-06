-- Inserir usuário administrador padrão
INSERT INTO users (email, name, username, password_hash) 
VALUES (
    'admin@raspadinhadomilhao.com', 
    'Administrador', 
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- senha: password
) ON CONFLICT (email) DO NOTHING;

-- Criar carteira para o administrador
INSERT INTO wallets (user_id, balance)
SELECT id, 0.00 FROM users WHERE email = 'admin@raspadinhadomilhao.com'
ON CONFLICT (user_id) DO NOTHING;

-- Inserir alguns usuários de teste
INSERT INTO users (email, name, username, password_hash) VALUES
    ('teste1@exemplo.com', 'Usuário Teste 1', 'teste1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    ('teste2@exemplo.com', 'Usuário Teste 2', 'teste2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (email) DO NOTHING;

-- Criar carteiras para usuários de teste
INSERT INTO wallets (user_id, balance)
SELECT id, 100.00 FROM users WHERE email IN ('teste1@exemplo.com', 'teste2@exemplo.com')
ON CONFLICT (user_id) DO NOTHING;

-- Inserir algumas transações de exemplo
INSERT INTO transactions (user_id, type, amount, status) 
SELECT 
    u.id,
    'deposit',
    50.00,
    'success'
FROM users u 
WHERE u.email = 'teste1@exemplo.com'
ON CONFLICT DO NOTHING;

INSERT INTO transactions (user_id, type, amount, status) 
SELECT 
    u.id,
    'game_play',
    5.00,
    'success'
FROM users u 
WHERE u.email = 'teste1@exemplo.com'
ON CONFLICT DO NOTHING;

-- Inserir alguns vencedores de exemplo
INSERT INTO winners (user_id, game_name, prize_amount)
SELECT 
    u.id,
    'Raspe da Esperança',
    25.00
FROM users u 
WHERE u.email = 'teste1@exemplo.com'
ON CONFLICT DO NOTHING;
