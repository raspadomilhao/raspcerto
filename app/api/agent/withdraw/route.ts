import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { getAgentByUserId, createAgentWithdrawal, getAgentStats } from "@/lib/agent-database"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
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

    if (agent.status !== "active") {
      return NextResponse.json({ error: "Agente não está ativo" }, { status: 403 })
    }

    const { amount, pix_key, pix_type } = await request.json()

    if (!amount || !pix_key || !pix_type) {
      return NextResponse.json(
        {
          error: "Todos os campos são obrigatórios",
        },
        { status: 400 },
      )
    }

    if (amount < 50) {
      return NextResponse.json(
        {
          error: "Valor mínimo para saque é R$ 50,00",
        },
        { status: 400 },
      )
    }

    // Verificar saldo disponível
    const stats = await getAgentStats(agent.id)
    const availableBalance = stats.total_commission_earned - stats.total_commission_paid

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: "Saldo insuficiente",
        },
        { status: 400 },
      )
    }

    // Debitar imediatamente o valor do saldo
    const sql = neon(process.env.DATABASE_URL!)
    await sql`
      UPDATE agents 
      SET total_commission_paid = total_commission_paid + ${amount}
      WHERE id = ${agent.id}
    `

    // Criar solicitação de saque
    const withdrawal = await createAgentWithdrawal(agent.id, amount, pix_key, pix_type)

    return NextResponse.json({
      success: true,
      message: "Solicitação de saque criada com sucesso",
      withdrawal,
    })
  } catch (error) {
    console.error("Erro ao criar saque de agente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
