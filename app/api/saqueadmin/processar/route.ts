import { type NextRequest, NextResponse } from "next/server"
import { sql, updateWalletBalance } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { request_id, action } = await request.json()

    console.log("🔄 Processando saque:", { request_id, action })

    if (!request_id || !action) {
      return NextResponse.json({ error: "ID do saque e ação são obrigatórios" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    // Buscar a transação
    const [transaction] = await sql`
      SELECT * FROM transactions 
      WHERE id = ${request_id} AND type = 'withdraw' AND status = 'pending'
    `

    console.log("📊 Transação encontrada:", transaction)

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada ou já processada" }, { status: 404 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"

    // Atualizar status da transação
    await sql`
      UPDATE transactions 
      SET status = ${newStatus}
      WHERE id = ${request_id}
    `

    console.log(`✅ Status atualizado para: ${newStatus}`)

    // Se rejeitado, devolver o valor para o usuário
    if (action === "reject") {
      await updateWalletBalance(transaction.user_id, Number(transaction.amount), "add")
      console.log(`💰 Valor devolvido: R$ ${transaction.amount} para usuário ${transaction.user_id}`)
    }

    return NextResponse.json({
      success: true,
      message: `Saque ${action === "approve" ? "aprovado" : "rejeitado"} com sucesso`,
    })
  } catch (error) {
    console.error("❌ Erro ao processar saque:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
