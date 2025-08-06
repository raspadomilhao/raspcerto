import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Teste básico de conexão
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`

    // Contar usuários
    const userCount = await sql`SELECT COUNT(*) as count FROM users`

    // Contar carteiras
    const walletCount = await sql`SELECT COUNT(*) as count FROM wallets`

    // Contar transações
    const transactionCount = await sql`SELECT COUNT(*) as count FROM transactions`

    return NextResponse.json({
      success: true,
      message: "Conexão com banco de dados estabelecida com sucesso!",
      database_info: {
        current_time: result[0].current_time,
        postgres_version: result[0].postgres_version,
      },
      stats: {
        total_users: Number.parseInt(userCount[0].count),
        total_wallets: Number.parseInt(walletCount[0].count),
        total_transactions: Number.parseInt(transactionCount[0].count),
      },
    })
  } catch (error) {
    console.error("Erro ao conectar com o banco:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Falha na conexão com o banco de dados",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
