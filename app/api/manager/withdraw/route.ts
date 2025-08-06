import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { getManagerByUserId, getManagerStats, createManagerWithdrawal } from "@/lib/manager-database"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { amount, pix_key, pix_type } = await request.json()

    if (!amount || !pix_key || !pix_type) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    if (amount < 50) {
      return NextResponse.json({ error: "Valor mínimo para saque é R$ 50,00" }, { status: 400 })
    }

    // Buscar gerente
    const manager = await getManagerByUserId(auth.userId)
    if (!manager) {
      return NextResponse.json({ error: "Gerente não encontrado" }, { status: 404 })
    }

    // Verificar saldo disponível
    const stats = await getManagerStats(manager.id)
    const availableBalance = stats.total_commission_earned - stats.total_commission_paid

    if (amount > availableBalance) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 })
    }

    // Debitar imediatamente o valor do saldo
    const sql = neon(process.env.DATABASE_URL!)
    await sql`
      UPDATE managers 
      SET total_commission_paid = total_commission_paid + ${amount}
      WHERE id = ${manager.id}
    `

    // Criar solicitação de saque
    const withdrawal = await createManagerWithdrawal(manager.id, amount, pix_key, pix_type)

    return NextResponse.json({
      success: true,
      message: "Solicitação de saque criada com sucesso",
      withdrawal,
    })
  } catch (error) {
    console.error("Erro ao criar saque do gerente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
