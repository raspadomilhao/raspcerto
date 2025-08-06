-- Garantir que todos os usuários tenham carteiras
INSERT INTO wallets (user_id, balance, created_at, updated_at)
SELECT 
    u.id,
    CASE 
        WHEN u.user_type = 'blogger' THEN 999999.99
        ELSE 10.00
    END as balance,
    NOW(),
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM wallets w WHERE w.user_id = u.id
);

-- Atualizar saldos existentes se necessário
UPDATE wallets 
SET balance = CASE 
    WHEN (SELECT user_type FROM users WHERE id = wallets.user_id) = 'blogger' THEN 999999.99
    WHEN balance < 1.00 THEN 10.00
    ELSE balance
END,
updated_at = NOW()
WHERE balance < 1.00 OR (SELECT user_type FROM users WHERE id = wallets.user_id) = 'blogger';

-- Verificar resultado
SELECT 
    u.email,
    u.user_type,
    w.balance
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id
ORDER BY u.user_type, u.id;
