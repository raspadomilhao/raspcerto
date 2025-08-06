import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import {
  getAffiliateByUserId,
  getAffiliateReferrals,
  getAffiliateCommissions,
  getAffiliateWithdrawals,
} from "@/lib/affiliate-database"

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar afiliado
    const affiliate = await getAffiliateByUserId(auth.userId)
    if (!affiliate) {
      return NextResponse.json({ error: "Você não é um afiliado" }, { status: 404 })
    }

    // Buscar dados do afiliado
    const referrals = await getAffiliateReferrals(affiliate.id, 10)
    const commissions = await getAffiliateCommissions(affiliate.id, 10)
    const withdrawals = await getAffiliateWithdrawals(affiliate.id)

    // Calcular estatísticas usando dados diretos da tabela affiliates
    const availableBalance = Number(affiliate.total_commission_earned) - Number(affiliate.total_commission_paid)
    const pendingWithdrawals = withdrawals
      .filter((w) => w.status === "pending")
      .reduce((sum, w) => sum + Number(w.amount), 0)

    const stats = {
      total_referrals: referrals.length,
      converted_referrals: referrals.filter((r) => r.status === "converted").length,
      total_commission_earned: Number(affiliate.total_commission_earned),
      total_commission_paid: Number(affiliate.total_commission_paid),
      available_balance: availableBalance,
      pending_withdrawals: pendingWithdrawals,
      total_referred_deposits: referrals.reduce((sum, r) => sum + Number(r.total_deposits || 0), 0),
    }

    console.log(`📊 Stats do afiliado ${affiliate.id}:`, stats)

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        affiliate_code: affiliate.affiliate_code,
        commission_rate: affiliate.commission_rate,
        status: affiliate.status,
        created_at: affiliate.created_at,
      },
      stats,
      referrals: referrals.slice(0, 5), // Últimas 5 referências
      commissions: commissions.slice(0, 5), // Últimas 5 comissões
      withdrawals: withdrawals.slice(0, 5), // Últimos 5 saques
    })
  } catch (error) {
    console.error("Erro ao buscar dashboard do afiliado:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
