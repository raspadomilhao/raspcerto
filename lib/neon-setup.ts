import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function testNeonConnection() {
  try {
    console.log("🔍 Testando conexão com Neon...")

    const result = await sql`SELECT NOW() as current_time, version() as version`

    console.log("✅ Conexão com Neon estabelecida!")
    console.log("📅 Hora atual:", result[0].current_time)
    console.log("🗄️ Versão PostgreSQL:", result[0].version)

    return {
      success: true,
      timestamp: result[0].current_time,
      version: result[0].version,
    }
  } catch (error) {
    console.error("❌ Erro ao conectar com Neon:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

export async function checkTables() {
  try {
    console.log("🔍 Verificando tabelas no banco...")

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    const tableNames = tables.map((t) => t.table_name)
    console.log("📋 Tabelas encontradas:", tableNames)

    const expectedTables = ["users", "wallets", "transactions", "webhook_logs", "withdrawals"]
    const missingTables = expectedTables.filter((table) => !tableNames.includes(table))

    return {
      success: missingTables.length === 0,
      tables: tableNames,
      missing: missingTables,
      total: tableNames.length,
    }
  } catch (error) {
    console.error("❌ Erro ao verificar tabelas:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      tables: [],
      missing: [],
      total: 0,
    }
  }
}

export async function getTableCounts() {
  try {
    console.log("📊 Contando registros nas tabelas...")

    // Verificar quais tabelas existem primeiro
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'wallets', 'transactions', 'webhook_logs', 'withdrawals')
    `

    const existingTables = tablesResult.map((t) => t.table_name)
    const counts: any = {}

    // Contar apenas tabelas que existem
    for (const table of existingTables) {
      try {
        const [result] = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
        counts[table] = Number.parseInt(result.count)
      } catch (error) {
        console.warn(`⚠️ Erro ao contar registros na tabela ${table}:`, error)
        counts[table] = 0
      }
    }

    // Garantir que todas as tabelas esperadas tenham um valor
    const expectedTables = ["users", "wallets", "transactions", "webhook_logs", "withdrawals"]
    for (const table of expectedTables) {
      if (!(table in counts)) {
        counts[table] = 0
      }
    }

    console.log("📊 Contagem de registros:", counts)

    return {
      success: true,
      counts,
    }
  } catch (error) {
    console.error("❌ Erro ao contar registros:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      counts: {
        users: 0,
        wallets: 0,
        transactions: 0,
        webhook_logs: 0,
        withdrawals: 0,
      },
    }
  }
}

export async function createSampleData() {
  try {
    console.log("🌱 Criando dados de exemplo...")

    // Verificar se já existem usuários
    const [userCount] = await sql`SELECT COUNT(*) as count FROM users`

    if (Number.parseInt(userCount.count) > 0) {
      console.log("ℹ️ Dados já existem, pulando criação de exemplos")
      return { success: true, message: "Dados já existem" }
    }

    // Criar usuário de teste
    const [testUser] = await sql`
      INSERT INTO users (email, name, username, user_type)
      VALUES ('teste@raspmania.com', 'Usuário Teste', 'teste', 'regular')
      RETURNING id
    `

    // Criar carteira para o usuário
    await sql`
      INSERT INTO wallets (user_id, balance)
      VALUES (${testUser.id}, 10.00)
    `

    console.log("✅ Dados de exemplo criados com sucesso!")

    return {
      success: true,
      message: "Dados de exemplo criados",
      testUserId: testUser.id,
    }
  } catch (error) {
    console.error("❌ Erro ao criar dados de exemplo:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
