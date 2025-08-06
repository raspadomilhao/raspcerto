-- Inserir alguns dados de exemplo para teste (opcional)

-- Exemplo: Tornar um usuário existente em afiliado (substitua o user_id por um ID real)
-- INSERT INTO affiliates (user_id, affiliate_code, commission_rate) 
-- VALUES (1, 'TESTE123', 15.00) 
-- ON CONFLICT (user_id) DO NOTHING;

-- Verificar se as tabelas foram criadas corretamente
SELECT 'Tabelas do sistema de afiliados criadas com sucesso!' as status;

-- Mostrar estrutura das tabelas
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('affiliates', 'referrals', 'commissions', 'commission_withdrawals')
ORDER BY table_name, ordinal_position;
