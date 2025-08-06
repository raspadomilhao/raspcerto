import { type NextRequest, NextResponse } from "next/server"
import { getUserById } from "@/lib/database"
import { updateCommissionWithdrawalStatus } from "@/lib/affiliate-database"

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { status, notes } = await request.json()
    const withdrawalId = Number.parseInt(params.id)

    if (!withdrawalId || !status) {
      return NextResponse.json(
        {
          error: "ID do saque e status são obrigatórios",
        },
        { status: 400 },
      )
    }

    await updateCommissionWithdrawalStatus(withdrawalId, status, notes)

    return NextResponse.json({
      success: true,
      message: "Status do saque atualizado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao processar saque:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
