import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { getTransactionByExternalId } from "@/lib/database"

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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    const url = new URL(request.url)
    const externalId = url.searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 Investigando pedido ${externalId}...`)

    // Buscar a transação no banco local
    const transaction = await getTransactionByExternalId(Number.parseInt(externalId))

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    console.log(`📋 Transação local:`, JSON.stringify(transaction, null, 2))

    // Buscar informações na API da HorsePay (se tiver access token)
    const horsePayData = null
    try {
      // Aqui você precisaria do access token do usuário
      // Por enquanto, vamos apenas mostrar os dados locais
      console.log(`⚠️ Para buscar dados da HorsePay, precisa do access token`)
    } catch (error) {
      console.log(`❌ Erro ao buscar na HorsePay:`, error)
    }

    return NextResponse.json({
      local_transaction: {
        id: transaction.id,
        external_id: transaction.external_id,
        amount_requested: Number.parseFloat(transaction.amount.toString()),
        status: transaction.status,
        type: transaction.type,
        payer_name: transaction.payer_name,
        created_at: transaction.created_at,
      },
      horsepay_data: horsePayData,
      investigation: {
        amount_difference: "Verifique se há taxa ou split configurado",
        next_steps: [
          "1. Verifique se há taxa da HorsePay",
          "2. Verifique se há split configurado",
          "3. Compare o valor solicitado vs valor recebido no webhook",
          "4. Consulte a documentação da HorsePay sobre taxas",
        ],
      },
    })
  } catch (error) {
    console.error("❌ Erro na investigação:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 },
    )
  }
}
