import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import {
  getManagerByUserId,
  getManagerAgents,
  getManagerStats,
  getManagerCommissions,
  getManagerWithdrawals,
} from "@/lib/manager-database"

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar gerente
    const manager = await getManagerByUserId(auth.userId)
    if (!manager) {
      return NextResponse.json({ error: "Gerente não encontrado" }, { status: 404 })
    }

    // Buscar dados do gerente
    const agents = await getManagerAgents(manager.id)
    const stats = await getManagerStats(manager.id)
    const commissions = await getManagerCommissions(manager.id)
    const withdrawals = await getManagerWithdrawals(manager.id)

    // Calcular saldo disponível (comissão total - comissão paga - saques)
    const availableBalance = stats.total_commission_earned - stats.total_commission_paid - stats.total_withdrawn

    return NextResponse.json({
      success: true,
      manager,
      agents,
      stats: {
        ...stats,
        available_balance: Math.max(0, availableBalance), // Garantir que não seja negativo
      },
      commissions,
      withdrawals,
    })
  } catch (error) {
    console.error("Erro ao buscar dashboard do gerente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
