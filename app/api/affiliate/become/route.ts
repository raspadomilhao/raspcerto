import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { createAffiliate, getAffiliateByUserId } from "@/lib/affiliate-database"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar se já é afiliado
    const existingAffiliate = await getAffiliateByUserId(auth.userId)
    if (existingAffiliate) {
      return NextResponse.json(
        {
          success: false,
          error: "Você já é um afiliado",
        },
        { status: 400 },
      )
    }

    // Criar afiliado com taxa padrão de 50%
    const affiliate = await createAffiliate(auth.userId, 50.0)

    return NextResponse.json({
      success: true,
      message: "Você agora é um afiliado!",
      affiliate: {
        id: affiliate.id,
        affiliate_code: affiliate.affiliate_code,
        commission_rate: affiliate.commission_rate,
        status: affiliate.status,
      },
    })
  } catch (error) {
    console.error("Erro ao criar afiliado:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
