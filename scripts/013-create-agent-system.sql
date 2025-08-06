-- Criar tabela de agentes
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    agent_code VARCHAR(20) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    total_affiliates INTEGER DEFAULT 0,
    total_commission_earned DECIMAL(10,2) DEFAULT 0.00,
    total_commission_paid DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Função para gerar código de agente
CREATE OR REPLACE FUNCTION generate_agent_code() RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'AGT' || LPAD(floor(random() * 999999)::text, 6, '0');
        SELECT EXISTS(SELECT 1 FROM agents WHERE agent_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Adicionar agent_id à tabela de afiliados
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id);

-- Criar tabela de comissões de agentes
CREATE TABLE IF NOT EXISTS agent_commissions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    transaction_id INTEGER REFERENCES transactions(id),
    commission_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de saques de agentes
CREATE TABLE IF NOT EXISTS agent_withdrawals (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
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
CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_withdrawals_updated_at 
    BEFORE UPDATE ON agent_withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_agent_code ON agents(agent_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_agent_id ON affiliates(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_id ON agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status ON agent_commissions(status);
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_agent_id ON agent_withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_status ON agent_withdrawals(status);

-- Comentários
COMMENT ON TABLE agents IS 'Agentes que gerenciam redes de afiliados';
COMMENT ON TABLE agent_commissions IS 'Comissões ganhas pelos agentes';
COMMENT ON TABLE agent_withdrawals IS 'Solicitações de saque dos agentes';
