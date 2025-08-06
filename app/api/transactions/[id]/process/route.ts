import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { getTransactionByExternalId, updateTransactionStatus, updateWalletBalance, getUserWallet } from "@/lib/database"

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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserFromRequest(request)
    const externalId = Number.parseInt(params.id)

    console.log(`🔄 Processando manualmente transação ${externalId} para usuário ${userId}`)

    // Buscar a transação
    const transaction = await getTransactionByExternalId(externalId)

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    // Verificar se a transação pertence ao usuário
    if (transaction.user_id !== userId) {
      return NextResponse.json({ error: "Transação não pertence ao usuário" }, { status: 403 })
    }

    console.log(`📋 Transação encontrada:`, JSON.stringify(transaction, null, 2))

    // Verificar saldo atual
    const walletBefore = await getUserWallet(userId)
    console.log(`💰 Saldo antes: R$ ${walletBefore?.balance || 0}`)

    // Se for um depósito pendente, marcar como sucesso e adicionar ao saldo
    if (transaction.type === "deposit" && transaction.status !== "success") {
      console.log(`✅ Marcando depósito como sucesso e adicionando ao saldo`)

      // Atualizar status
      await updateTransactionStatus(externalId, "success")

      // Adicionar ao saldo
      const updatedWallet = await updateWalletBalance(userId, Number.parseFloat(transaction.amount.toString()), "add")

      // Verificar saldo após
      const walletAfter = await getUserWallet(userId)
      console.log(`💰 Saldo depois: R$ ${walletAfter?.balance || 0}`)

      return NextResponse.json({
        success: true,
        message: "Transação processada com sucesso",
        transaction: {
          id: transaction.id,
          external_id: externalId,
          amount: transaction.amount,
          old_status: transaction.status,
          new_status: "success",
        },
        wallet: {
          balance_before: walletBefore?.balance,
          balance_after: walletAfter?.balance,
        },
      })
    }

    return NextResponse.json({
      success: false,
      message: "Transação não pode ser processada",
      reason: `Tipo: ${transaction.type}, Status: ${transaction.status}`,
    })
  } catch (error) {
    console.error("❌ Erro ao processar transação:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
