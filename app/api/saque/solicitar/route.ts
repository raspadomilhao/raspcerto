import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { updateWalletBalance, createTransaction } from "@/lib/database"

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
    const { amount, pix_type, pix_key } = await request.json()

    // Validações
    if (!amount || amount < 50) {
      return NextResponse.json({ error: "Valor mínimo para saque é R$ 50,00" }, { status: 400 })
    }

    if (!pix_type || !pix_key) {
      return NextResponse.json({ error: "Tipo e chave PIX são obrigatórios" }, { status: 400 })
    }

    // Verificar saldo do usuário na tabela wallets
    const { sql } = await import("@/lib/database")
    const [wallet] = await sql`
      SELECT balance FROM wallets WHERE user_id = ${userId}
    `

    if (!wallet || Number(wallet.balance) < amount) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 })
    }

    // Debitar saldo do usuário usando a função updateWalletBalance
    await updateWalletBalance(userId, amount, "subtract")

    // Criar solicitação de saque com chave PIX
    await createTransaction({
      user_id: userId,
      type: "withdraw",
      amount: amount,
      status: "pending",
      pix_key: pix_key,
      pix_type: pix_type,
    })

    return NextResponse.json({
      success: true,
      message: "Solicitação de saque criada com sucesso",
    })
  } catch (error) {
    console.error("Erro ao solicitar saque:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
