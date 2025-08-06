import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { updateWalletBalance, sql } from "@/lib/database"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "horsepay-secret-key")

async function getUserFromRequest(request: NextRequest) {
  let token = request.cookies.get("auth-token")?.value

  if (!token) {
    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    throw new Error("Token não encontrado")
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.userId as number
  } catch (error) {
    throw new Error("Token inválido")
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    const { withdraw_id } = await request.json()

    if (!withdraw_id) {
      return NextResponse.json({ error: "ID do saque é obrigatório" }, { status: 400 })
    }

    // Buscar a transação de saque
    const [transaction] = await sql`
      SELECT * FROM transactions 
      WHERE id = ${withdraw_id} AND user_id = ${userId} AND type = 'withdraw'
    `

    if (!transaction) {
      return NextResponse.json({ error: "Saque não encontrado" }, { status: 404 })
    }

    // Verificar se o saque está pendente
    if (transaction.status !== "pending") {
      return NextResponse.json(
        {
          error: "Apenas saques pendentes podem ser cancelados",
        },
        { status: 400 },
      )
    }

    // Devolver o valor para a carteira do usuário
    await updateWalletBalance(userId, Number(transaction.amount), "add")

    // Atualizar o status da transação para cancelado
    await sql`
      UPDATE transactions 
      SET status = 'cancelled'
      WHERE id = ${withdraw_id}
    `

    console.log(
      `✅ Saque ${withdraw_id} cancelado com sucesso. Valor R$ ${transaction.amount} devolvido ao usuário ${userId}`,
    )

    return NextResponse.json({
      success: true,
      message: "Saque cancelado com sucesso",
      amount_returned: transaction.amount,
    })
  } catch (error) {
    console.error("Erro ao cancelar saque:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
