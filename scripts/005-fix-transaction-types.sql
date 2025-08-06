-- Script para corrigir os tipos de transação
-- Primeiro, vamos ver quais constraints existem
DO $$ 
BEGIN
    -- Remove todas as constraints de check relacionadas ao tipo
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'transactions_type_check' 
               AND table_name = 'transactions') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
    END IF;
    
    -- Atualiza os tipos de transação para garantir que todos estão corretos
    UPDATE transactions SET type = 'game_play' WHERE type = 'game' AND amount < 0;
    UPDATE transactions SET type = 'game_prize' WHERE type = 'prize' OR (type = 'game' AND amount > 0);
    
    -- Adiciona a nova constraint com todos os tipos
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('deposit', 'withdraw', 'game_play', 'game_prize'));
    
    RAISE NOTICE 'Constraint atualizada com sucesso!';
END $$;

-- Verificar se existem transações com tipos inválidos
SELECT type, COUNT(*) 
FROM transactions 
WHERE type NOT IN ('deposit', 'withdraw', 'game_play', 'game_prize')
GROUP BY type;
