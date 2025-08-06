import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { getAffiliateByUserId, createCommissionWithdrawal, sql } from "@/lib/affiliate-database"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { amount, pix_key, pix_type } = await request.json()

    // Validações
    if (!amount || !pix_key || !pix_type) {
      return NextResponse.json(
        {
          error: "Todos os campos são obrigatórios",
        },
        { status: 400 },
      )
    }

    if (amount < 10) {
      return NextResponse.json(
        {
          error: "Valor mínimo para saque é R$ 10,00",
        },
        { status: 400 },
      )
    }

    // Buscar afiliado
    const affiliate = await getAffiliateByUserId(auth.userId)
    if (!affiliate) {
      return NextResponse.json(
        {
          error: "Você não é um afiliado",
        },
        { status: 404 },
      )
    }

    // Verificar saldo disponível usando dados diretos da tabela affiliates
    const availableBalance = Number(affiliate.total_commission_earned) - Number(affiliate.total_commission_paid)

    console.log(`💰 Verificando saldo do afiliado ${affiliate.id}:`, {
      earned: affiliate.total_commission_earned,
      paid: affiliate.total_commission_paid,
      available: availableBalance,
      requested: amount,
    })

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Criar solicitação de saque
    const withdrawal = await createCommissionWithdrawal(affiliate.id, amount, pix_key, pix_type)

    // CORREÇÃO: Debitar imediatamente do saldo para evitar múltiplos saques
    await sql`
      UPDATE affiliates 
      SET total_commission_paid = total_commission_paid + ${amount}
      WHERE id = ${affiliate.id}
    `

    console.log(`💸 Valor R$ ${amount} debitado imediatamente do afiliado ${affiliate.id}`)

    return NextResponse.json({
      success: true,
      message: "Solicitação de saque criada com sucesso",
      withdrawal,
    })
  } catch (error) {
    console.error("Erro ao solicitar saque:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
