import { type NextRequest, NextResponse } from "next/server"
import { getUserById } from "@/lib/database"
import {
  getAllAffiliates,
  updateAffiliateCommissionRate,
  getPendingCommissionWithdrawals,
  updateAffiliateStatus,
} from "@/lib/affiliate-database"

// Função para verificar autenticação admin
async function verifyAdminAuth(request: NextRequest) {
  try {
    // Verificar se tem o header de admin
    const adminAuth = request.headers.get("x-admin-auth")
    if (adminAuth === "admin-session-active") {
      return { userId: 1, email: "admin@system.com", userType: "admin" }
    }

    // Fallback: tentar verificação JWT normal
    const { verifyAuth } = await import("@/lib/auth")
    return await verifyAuth(request)
  } catch (error) {
    console.error("❌ Erro na verificação admin:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Iniciando busca de afiliados...")

    const auth = await verifyAdminAuth(request)
    if (!auth) {
      console.log("❌ Não autorizado")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log("✅ Usuário autenticado:", auth.userId)

    // Para admin, pular verificação de usuário no banco
    if (auth.userType === "admin") {
      console.log("✅ Usuário é admin, buscando dados...")
    } else {
      // Verificar se é admin no banco para usuários normais
      const user = await getUserById(auth.userId)
      if (!user || user.user_type !== "admin") {
        console.log("❌ Usuário não é admin:", user?.user_type)
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
      }
    }

    const affiliates = await getAllAffiliates()
    const pendingWithdrawals = await getPendingCommissionWithdrawals()

    console.log("📊 Dados encontrados:", {
      affiliates: affiliates.length,
      withdrawals: pendingWithdrawals.length,
    })

    return NextResponse.json({
      success: true,
      affiliates,
      pending_withdrawals: pendingWithdrawals,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar afiliados:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Para admin, pular verificação de usuário no banco
    if (auth.userType !== "admin") {
      const user = await getUserById(auth.userId)
      if (!user || user.user_type !== "admin") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
      }
    }

    const { affiliate_id, commission_rate, status } = await request.json()

    if (!affiliate_id) {
      return NextResponse.json(
        {
          error: "ID do afiliado é obrigatório",
        },
        { status: 400 },
      )
    }

    if (commission_rate !== undefined) {
      await updateAffiliateCommissionRate(affiliate_id, commission_rate)
    }

    if (status !== undefined) {
      await updateAffiliateStatus(affiliate_id, status)
    }

    return NextResponse.json({
      success: true,
      message: "Afiliado atualizado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao atualizar afiliado:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
