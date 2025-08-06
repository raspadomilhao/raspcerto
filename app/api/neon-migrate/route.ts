import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("🚀 Iniciando migração completa do banco...")

    // Script de migração completo
    const migrationScript = `
      -- Limpar tabelas existentes (cuidado em produção!)
      DROP TABLE IF EXISTS webhook_logs CASCADE;
      DROP TABLE IF EXISTS games CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS wallets CASCADE;
      DROP TABLE IF EXISTS withdrawals CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      -- Criar tabela de usuários
      CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(100) UNIQUE,
          phone VARCHAR(20),
          password_hash TEXT,
          client_key VARCHAR(255),
          client_secret VARCHAR(255),
          user_type VARCHAR(20) DEFAULT 'regular' CHECK (user_type IN ('regular', 'blogger', 'admin')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar tabela de carteiras
      CREATE TABLE wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          balance DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
      );

      -- Criar tabela de transações
      CREATE TABLE transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'game_play', 'game_prize')),
          amount DECIMAL(12,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
          external_id INTEGER,
          end_to_end_id VARCHAR(255),
          payer_name VARCHAR(255),
          pix_key VARCHAR(255),
          pix_type VARCHAR(50),
          callback_url TEXT,
          qr_code TEXT,
          copy_paste_code TEXT,
          is_demo BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar tabela de saques
      CREATE TABLE withdrawals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(12,2) NOT NULL,
          pix_key VARCHAR(255) NOT NULL,
          pix_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
          external_id INTEGER,
          error_message TEXT,
          processed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar tabela de logs de webhook
      CREATE TABLE webhook_logs (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          external_id INTEGER,
          payload JSONB NOT NULL,
          processed BOOLEAN DEFAULT FALSE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar índices para performance
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_username ON users(username);
      CREATE INDEX idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX idx_transactions_external_id ON transactions(external_id);
      CREATE INDEX idx_transactions_type ON transactions(type);
      CREATE INDEX idx_transactions_status ON transactions(status);
      CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
      CREATE INDEX idx_withdrawals_status ON withdrawals(status);
      CREATE INDEX idx_webhook_logs_external_id ON webhook_logs(external_id);
      CREATE INDEX idx_webhook_logs_processed ON webhook_logs(processed);
    `

    // Executar migração em transação
    await sql.transaction(async (tx) => {
      const statements = migrationScript
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

      for (const statement of statements) {
        console.log(`Executando: ${statement.substring(0, 50)}...`)
        await tx.unsafe(statement)
      }
    })

    // Inserir dados iniciais
    console.log("👤 Criando usuários padrão...")

    // Usuário admin
    await sql`
      INSERT INTO users (email, name, username, phone, password_hash, user_type)
      VALUES (
          'admin@raspmania.com',
          'Administrador',
          'admin',
          '11999999999',
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9PS',
          'admin'
      ) ON CONFLICT (email) DO NOTHING
    `

    // Usuário blogger
    await sql`
      INSERT INTO users (email, name, username, phone, password_hash, user_type)
      VALUES (
          'blogger@raspmania.com',
          'Blogger Teste',
          'blogger',
          '11888888888',
          '$2a$12$8HqAPvnn.6fwxIjyoQ8hUOQb5QjJ5VJeOp7.VC6nt6pMjxn8OyKaS',
          'blogger'
      ) ON CONFLICT (email) DO NOTHING
    `

    // Usuário teste
    await sql`
      INSERT INTO users (email, name, username, phone, password_hash, user_type)
      VALUES (
          'teste@raspmania.com',
          'Usuário Teste',
          'teste',
          '11777777777',
          '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          'regular'
      ) ON CONFLICT (email) DO NOTHING
    `

    // Criar carteiras para os usuários
    console.log("💰 Criando carteiras...")
    await sql`
      INSERT INTO wallets (user_id, balance)
      SELECT u.id, 
        CASE 
          WHEN u.user_type = 'blogger' THEN 999999.99
          WHEN u.user_type = 'admin' THEN 100000.00
          ELSE 10.00
        END
      FROM users u
      WHERE u.email IN ('admin@raspmania.com', 'blogger@raspmania.com', 'teste@raspmania.com')
      ON CONFLICT (user_id) DO NOTHING
    `

    console.log("✅ Migração concluída com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Banco de dados migrado com sucesso!",
      details: {
        tables_created: ["users", "wallets", "transactions", "withdrawals", "webhook_logs"],
        indexes_created: 12,
        default_users: ["admin@raspmania.com", "blogger@raspmania.com", "teste@raspmania.com"],
      },
    })
  } catch (error) {
    console.error("❌ Erro na migração:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na migração",
      },
      { status: 500 },
    )
  }
}
