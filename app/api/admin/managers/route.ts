import { type NextRequest, NextResponse } from "next/server"
import { getUserById, getUserByEmail } from "@/lib/database"
import {
  getAllManagers,
  createManager,
  updateManagerCommissionRate,
  updateManagerStatus,
  getPendingManagerWithdrawals,
  getManagerByUserId,
} from "@/lib/manager-database"

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
    console.log("🔍 Iniciando busca de gerentes...")

    const auth = await verifyAdminAuth(request)
    if (!auth) {
      console.log("❌ Não autorizado")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log("✅ Usuário autenticado:", auth.userId)

    // Para admin, pular verificação de usuário no banco
    if (auth.userType !== "admin") {
      const user = await getUserById(auth.userId)
      if (!user || user.user_type !== "admin") {
        console.log("❌ Usuário não é admin:", user?.user_type)
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
      }
    }

    const managers = await getAllManagers()
    const pendingWithdrawals = await getPendingManagerWithdrawals()

    console.log("📊 Dados encontrados:", {
      managers: managers.length,
      withdrawals: pendingWithdrawals.length,
    })

    return NextResponse.json({
      success: true,
      managers,
      pending_withdrawals: pendingWithdrawals,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar gerentes:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
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

    const { user_email, commission_rate } = await request.json()

    if (!user_email) {
      return NextResponse.json(
        {
          error: "Email do usuário é obrigatório",
        },
        { status: 400 },
      )
    }

    // Buscar usuário por email
    const user = await getUserByEmail(user_email)
    if (!user) {
      return NextResponse.json(
        {
          error: "Usuário não encontrado",
        },
        { status: 404 },
      )
    }

    // Verificar se já é gerente
    const existingManager = await getManagerByUserId(user.id)
    if (existingManager) {
      return NextResponse.json(
        {
          error: "Usuário já é um gerente",
        },
        { status: 400 },
      )
    }

    const manager = await createManager(user.id, commission_rate || 5.0)

    return NextResponse.json({
      success: true,
      message: "Gerente criado com sucesso",
      manager,
    })
  } catch (error) {
    console.error("Erro ao criar gerente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
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

    const { manager_id, commission_rate, status } = await request.json()

    if (!manager_id) {
      return NextResponse.json(
        {
          error: "ID do gerente é obrigatório",
        },
        { status: 400 },
      )
    }

    if (commission_rate !== undefined) {
      await updateManagerCommissionRate(manager_id, commission_rate)
    }

    if (status !== undefined) {
      await updateManagerStatus(manager_id, status)
    }

    return NextResponse.json({
      success: true,
      message: "Gerente atualizado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao atualizar gerente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
