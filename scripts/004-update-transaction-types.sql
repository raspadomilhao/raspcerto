-- Primeiro, remover a constraint existente
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Adicionar nova constraint que permite os novos tipos
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdraw', 'game_play', 'game_prize'));

-- Atualizar transações existentes que eram categorizadas incorretamente
UPDATE transactions 
SET type = 'game_play' 
WHERE type = 'withdraw' 
AND payer_name LIKE 'Jogo:%';

UPDATE transactions 
SET type = 'game_prize' 
WHERE type = 'deposit' 
AND payer_name LIKE 'Prêmio:%';
