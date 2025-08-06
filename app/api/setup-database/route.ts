import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("🔍 Verificando conexão com o banco...")

    // Testar conexão básica
    const connectionTest = await sql`SELECT NOW() as current_time, version() as db_version`
    console.log("✅ Conexão estabelecida:", connectionTest[0])

    // Verificar se as tabelas existem
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    const tableNames = tables.map((t) => t.table_name)
    console.log("📋 Tabelas encontradas:", tableNames)

    // Verificar tabelas necessárias
    const requiredTables = ["users", "wallets", "transactions", "games", "webhook_logs"]
    const missingTables = requiredTables.filter((table) => !tableNames.includes(table))

    // Contar registros nas tabelas principais
    const tableCounts = {}
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        try {
          const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`
          tableCounts[table] = count[0].count
        } catch (error) {
          tableCounts[table] = "Erro ao contar"
        }
      } else {
        tableCounts[table] = "Tabela não existe"
      }
    }

    return NextResponse.json({
      success: true,
      connection: {
        status: "Conectado",
        timestamp: connectionTest[0].current_time,
        version: connectionTest[0].db_version,
      },
      tables: {
        found: tableNames,
        missing: missingTables,
        counts: tableCounts,
      },
      ready: missingTables.length === 0,
    })
  } catch (error) {
    console.error("❌ Erro ao verificar banco:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        connection: {
          status: "Erro de conexão",
        },
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    console.log("🚀 Executando setup do banco de dados...")

    // Script SQL completo para criar todas as tabelas
    const setupScript = `
      -- Criar tabela de usuários
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(100) UNIQUE NOT NULL,
          phone VARCHAR(20),
          password_hash TEXT NOT NULL,
          user_type VARCHAR(20) DEFAULT 'regular' CHECK (user_type IN ('regular', 'blogger', 'admin')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar tabela de carteiras
      CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
      );

      -- Criar tabela de transações
      CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'game_win', 'game_loss')),
          amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
          external_id INTEGER,
          end_to_end_id VARCHAR(255),
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar tabela de jogos
      CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          game_type VARCHAR(50) NOT NULL,
          bet_amount DECIMAL(10,2) NOT NULL,
          prize_amount DECIMAL(10,2) DEFAULT 0.00,
          is_winner BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar tabela de logs de webhook
      CREATE TABLE IF NOT EXISTS webhook_logs (
          id SERIAL PRIMARY KEY,
          type VARCHAR(20) NOT NULL,
          external_id INTEGER,
          payload JSONB NOT NULL,
          processed BOOLEAN DEFAULT FALSE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Criar índices
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
      CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_external_id ON webhook_logs(external_id);
    `

    // Executar o script
    await sql.transaction(async (tx) => {
      const statements = setupScript.split(";").filter((stmt) => stmt.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          await tx.unsafe(statement.trim())
        }
      }
    })

    // Inserir dados padrão
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

    // Criar carteiras
    console.log("💰 Criando carteiras...")
    await sql`
      INSERT INTO wallets (user_id, balance)
      SELECT id, CASE 
          WHEN user_type = 'blogger' THEN 999999.99
          WHEN user_type = 'admin' THEN 100000.00
          ELSE 0.00
      END
      FROM users
      WHERE email IN ('admin@raspmania.com', 'blogger@raspmania.com')
      ON CONFLICT (user_id) DO NOTHING
    `

    console.log("✅ Setup do banco concluído com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Banco de dados configurado com sucesso!",
      details: {
        tables_created: ["users", "wallets", "transactions", "games", "webhook_logs"],
        indexes_created: 7,
        default_users: ["admin@raspmania.com", "blogger@raspmania.com"],
      },
    })
  } catch (error) {
    console.error("❌ Erro no setup:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
