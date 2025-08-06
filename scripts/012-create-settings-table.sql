-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão do sistema de afiliados
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_affiliate_commission_rate', '50.0', 'Taxa de comissão padrão para novos afiliados (%)'),
('min_commission_withdrawal', '50.00', 'Valor mínimo para saque de comissão (R$)'),
('max_commission_withdrawal', '10000.00', 'Valor máximo para saque de comissão (R$)'),
('affiliate_system_enabled', 'true', 'Sistema de afiliados ativo/inativo')
ON CONFLICT (setting_key) DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE system_settings IS 'Configurações gerais do sistema';
COMMENT ON COLUMN system_settings.setting_key IS 'Chave única da configuração';
COMMENT ON COLUMN system_settings.setting_value IS 'Valor da configuração';
COMMENT ON COLUMN system_settings.description IS 'Descrição da configuração';
