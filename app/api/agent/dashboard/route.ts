import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import {
  getAgentByUserId,
  getAgentAffiliates,
  getAgentStats,
  getAgentCommissions,
  getAgentWithdrawals,
} from "@/lib/agent-database"

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar agente
    const agent = await getAgentByUserId(auth.userId)
    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 })
    }

    // Buscar dados do agente
    const affiliates = await getAgentAffiliates(agent.id)
    const stats = await getAgentStats(agent.id)
    const commissions = await getAgentCommissions(agent.id)
    const withdrawals = await getAgentWithdrawals(agent.id)

    // Calcular saldo disponível corretamente
    const totalWithdrawn = withdrawals
      .filter((w) => w.status === "completed" || w.status === "paid")
      .reduce((sum, w) => sum + Number(w.amount), 0)

    const availableBalance = stats.total_commission_earned - stats.total_commission_paid - totalWithdrawn

    console.log(`💰 Calculando saldo do agente ${agent.id}:`)
    console.log(`- Comissão total: ${stats.total_commission_earned}`)
    console.log(`- Comissão paga: ${stats.total_commission_paid}`)
    console.log(`- Total sacado: ${totalWithdrawn}`)
    console.log(`- Saldo disponível: ${availableBalance}`)

    return NextResponse.json({
      success: true,
      agent,
      affiliates,
      stats: {
        ...stats,
        available_balance: Math.max(0, availableBalance), // Garantir que não seja negativo
      },
      commissions,
      withdrawals,
    })
  } catch (error) {
    console.error("Erro ao buscar dashboard do agente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
