import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { sql, updateWalletBalance, getUserById } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { external_id } = await request.json()

    if (!external_id) {
      return NextResponse.json({ error: "external_id é obrigatório" }, { status: 400 })
    }

    // Buscar a transação
    const [transaction] = await sql`
      SELECT * FROM transactions WHERE external_id = ${external_id} AND user_id = ${auth.userId}
    `

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    if (transaction.status === "success") {
      return NextResponse.json({ error: "Transação já processada" }, { status: 400 })
    }

    // Buscar dados do usuário
    const user = await getUserById(auth.userId)
    if (!user || user.user_type !== "blogger") {
      return NextResponse.json({ error: "Simulação disponível apenas para bloggers" }, { status: 403 })
    }

    const amount = Number.parseFloat(transaction.amount.toString())

    console.log(`🎭 SIMULANDO DEPÓSITO PARA BLOGGER:`)
    console.log(`🎭 Usuário: ${user.name} (${user.email})`)
    console.log(`🎭 Valor: R$ ${amount.toFixed(2)}`)
    console.log(`🎭 External ID: ${external_id}`)

    // Atualizar status da transação
    await sql`
      UPDATE transactions
      SET status = 'success'
      WHERE external_id = ${external_id}
    `

    // Creditar o valor na carteira
    await updateWalletBalance(auth.userId, amount, "add", user.user_type)

    console.log(`🎭 Depósito realizado com sucesso!`)

    return NextResponse.json({
      success: true,
      message: "Depósito realizado com sucesso",
      amount: amount,
    })
  } catch (error) {
    console.error("❌ Erro ao simular depósito:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
