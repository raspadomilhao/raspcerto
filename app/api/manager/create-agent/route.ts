import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { getUserByEmail } from "@/lib/database"
import { getManagerByUserId, createAgentForManager } from "@/lib/manager-database"
import { getAgentByUserId } from "@/lib/agent-database"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
    }

    // Buscar gerente
    const manager = await getManagerByUserId(auth.userId)
    if (!manager) {
      return NextResponse.json({ error: "Gerente não encontrado" }, { status: 404 })
    }

    // Buscar usuário por email
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar se já é agente
    const existingAgent = await getAgentByUserId(user.id)
    if (existingAgent) {
      return NextResponse.json({ error: "Usuário já é um agente" }, { status: 400 })
    }

    // Criar agente vinculado ao gerente com taxa FIXA de 10%
    // Gerentes não podem escolher a taxa - apenas admin pode alterar depois
    const agent = await createAgentForManager(manager.id, user.id, 10.0)

    return NextResponse.json({
      success: true,
      message: "Agente criado com sucesso com taxa de 10%",
      agent,
    })
  } catch (error) {
    console.error("Erro ao criar agente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
