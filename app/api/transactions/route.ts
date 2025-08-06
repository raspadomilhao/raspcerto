import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { createTransaction, getUserWallet, updateWalletBalance } from "@/lib/database"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "horsepay-secret-key")

async function getUserFromRequest(request: NextRequest) {
  // Tentar obter token do cookie primeiro
  let token = request.cookies.get("auth-token")?.value

  // Se não encontrar no cookie, tentar no header Authorization
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
    const { type, amount, ...otherData } = await request.json()

    // Verificar saldo para saques
    if (type === "withdraw") {
      const wallet = await getUserWallet(userId)
      if (!wallet || wallet.balance < amount) {
        return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 })
      }

      // Debitar o valor do saldo imediatamente para saques
      await updateWalletBalance(userId, amount, "subtract")
    }

    // Criar transação no banco
    const transaction = await createTransaction({
      user_id: userId,
      type,
      amount,
      status: "pending",
      ...otherData,
    })

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error) {
    console.error("Erro ao criar transação:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
