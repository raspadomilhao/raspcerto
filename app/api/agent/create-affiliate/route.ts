import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { getUserByEmail } from "@/lib/database"
import { getAgentByUserId, createAffiliateForAgent } from "@/lib/agent-database"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar agente
    const agent = await getAgentByUserId(auth.userId)
    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 })
    }

    if (agent.status !== "active") {
      return NextResponse.json({ error: "Agente não está ativo" }, { status: 403 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        {
          error: "Email é obrigatório",
        },
        { status: 400 },
      )
    }

    // Verificar se usuário existe
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        {
          error: "Usuário não encontrado. O usuário precisa estar cadastrado no sistema.",
        },
        { status: 404 },
      )
    }

    // Verificar se já é afiliado
    const { getAffiliateByUserId } = await import("@/lib/affiliate-database")
    const existingAffiliate = await getAffiliateByUserId(user.id)
    if (existingAffiliate) {
      return NextResponse.json(
        {
          error: "Usuário já é um afiliado",
        },
        { status: 400 },
      )
    }

    // Criar afiliado vinculado ao agente com taxa fixa de 50%
    const affiliate = await createAffiliateForAgent(agent.id, user.id, 50.0)

    return NextResponse.json({
      success: true,
      message: "Afiliado vinculado com sucesso",
      affiliate: {
        ...affiliate,
        user_name: user.name,
        user_email: user.email,
      },
    })
  } catch (error) {
    console.error("Erro ao criar afiliado:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
