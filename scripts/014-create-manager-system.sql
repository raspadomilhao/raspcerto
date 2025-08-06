-- Criar tabela de gerentes
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    manager_code VARCHAR(20) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    total_agents INTEGER DEFAULT 0,
    total_commission_earned DECIMAL(10,2) DEFAULT 0.00,
    total_commission_paid DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Função para gerar código de gerente
CREATE OR REPLACE FUNCTION generate_manager_code() RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'MGR' || LPAD(floor(random() * 999999)::text, 6, '0');
        SELECT EXISTS(SELECT 1 FROM managers WHERE manager_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Adicionar manager_id à tabela de agentes
ALTER TABLE agents ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES managers(id);

-- Criar tabela de comissões de gerentes
CREATE TABLE IF NOT EXISTS manager_commissions (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER REFERENCES managers(id),
    agent_id INTEGER REFERENCES agents(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    transaction_id INTEGER REFERENCES transactions(id),
    commission_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de saques de gerentes
CREATE TABLE IF NOT EXISTS manager_withdrawals (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER REFERENCES managers(id),
    amount DECIMAL(10,2) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    pix_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Triggers para updated_at
CREATE TRIGGER update_managers_updated_at 
    BEFORE UPDATE ON managers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manager_withdrawals_updated_at 
    BEFORE UPDATE ON manager_withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_managers_user_id ON managers(user_id);
CREATE INDEX IF NOT EXISTS idx_managers_manager_code ON managers(manager_code);
CREATE INDEX IF NOT EXISTS idx_agents_manager_id ON agents(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_commissions_manager_id ON manager_commissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_commissions_status ON manager_commissions(status);
CREATE INDEX IF NOT EXISTS idx_manager_withdrawals_manager_id ON manager_withdrawals(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_withdrawals_status ON manager_withdrawals(status);

-- Comentários
COMMENT ON TABLE managers IS 'Gerentes que gerenciam redes de agentes';
COMMENT ON TABLE manager_commissions IS 'Comissões ganhas pelos gerentes';
COMMENT ON TABLE manager_withdrawals IS 'Solicitações de saque dos gerentes';
