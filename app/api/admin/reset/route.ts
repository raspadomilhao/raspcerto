import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"

const RESET_PASSWORD = "Psicodelia12@"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Verificar senha de reset
    if (password !== RESET_PASSWORD) {
      return NextResponse.json({ error: "Senha de reset incorreta" }, { status: 401 })
    }

    console.log("🔄 Iniciando reset do sistema...")

    // Resetar dados em ordem (devido às foreign keys)

    // 1. Limpar logs de webhook
    await sql`DELETE FROM webhook_logs`
    console.log("✅ Logs de webhook removidos")

    // 2. Limpar transações
    await sql`DELETE FROM transactions`
    console.log("✅ Transações removidas")

    // 3. Resetar saldos das carteiras para zero
    await sql`UPDATE wallets SET balance = 0.0`
    console.log("✅ Saldos das carteiras zerados")

    // 4. Resetar sequências/auto-increment se necessário
    await sql`ALTER SEQUENCE transactions_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE webhook_logs_id_seq RESTART WITH 1`
    console.log("✅ Sequências resetadas")

    console.log("🎉 Reset do sistema concluído com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Sistema resetado com sucesso. Usuários mantidos, dados financeiros e de jogos removidos.",
      timestamp: new Date().toISOString(),
      actions_performed: [
        "Transações removidas",
        "Logs de webhook removidos",
        "Saldos das carteiras zerados",
        "Sequências resetadas",
      ],
    })
  } catch (error) {
    console.error("❌ Erro durante reset do sistema:", error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor durante reset",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
