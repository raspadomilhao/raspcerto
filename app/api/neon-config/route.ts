import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json()

    if (!connectionString) {
      return NextResponse.json({ success: false, error: "String de conexão é obrigatória" }, { status: 400 })
    }

    // Testar a conexão
    const sql = neon(connectionString)

    const result = await sql`SELECT NOW() as current_time, version() as db_version`

    return NextResponse.json({
      success: true,
      connection: {
        status: "Conectado",
        timestamp: result[0].current_time,
        version: result[0].db_version,
      },
    })
  } catch (error) {
    console.error("Erro ao testar conexão:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
