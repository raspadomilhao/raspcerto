-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    min_deposit DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    max_deposit DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
    min_withdraw DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    max_withdraw DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_single_row CHECK (id = 1),
    CONSTRAINT check_deposit_limits CHECK (min_deposit > 0 AND max_deposit > min_deposit),
    CONSTRAINT check_withdraw_limits CHECK (min_withdraw > 0 AND max_withdraw > min_withdraw)
);

-- Inserir configurações padrão
INSERT INTO settings (id, min_deposit, max_deposit, min_withdraw, max_withdraw)
VALUES (1, 1.00, 10000.00, 10.00, 5000.00)
ON CONFLICT (id) DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE settings IS 'Configurações globais do sistema';
COMMENT ON COLUMN settings.min_deposit IS 'Valor mínimo para depósitos em reais';
COMMENT ON COLUMN settings.max_deposit IS 'Valor máximo para depósitos em reais';
COMMENT ON COLUMN settings.min_withdraw IS 'Valor mínimo para saques em reais';
COMMENT ON COLUMN settings.max_withdraw IS 'Valor máximo para saques em reais';
