import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { getUserWallet, getUserTransactions, getUserStats } from "@/lib/database"

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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)

    console.log(`🔍 Debug da carteira do usuário ${userId}`)

    const [wallet, transactions, stats] = await Promise.all([
      getUserWallet(userId),
      getUserTransactions(userId, 20),
      getUserStats(userId),
    ])

    console.log("💰 Carteira:", JSON.stringify(wallet, null, 2))
    console.log("📊 Estatísticas:", JSON.stringify(stats, null, 2))
    console.log("📋 Transações:", JSON.stringify(transactions, null, 2))

    return NextResponse.json({
      user_id: userId,
      wallet,
      stats,
      transactions,
      debug_info: {
        wallet_balance_type: typeof wallet?.balance,
        wallet_balance_value: wallet?.balance,
        total_transactions: transactions.length,
        successful_deposits: transactions.filter((t) => t.type === "deposit" && t.status === "success").length,
        pending_deposits: transactions.filter((t) => t.type === "deposit" && t.status === "pending").length,
      },
    })
  } catch (error) {
    console.error("❌ Erro no debug da carteira:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Não autorizado",
      },
      { status: 401 },
    )
  }
}
