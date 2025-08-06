import { type NextRequest, NextResponse } from "next/server"
import { getUserById, updateUserPasswordHash } from "@/lib/database"
import { verifyAuth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request)
    if (!auth || auth.userType !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const affiliateId = Number.parseInt(params.id)
    if (isNaN(affiliateId)) {
      return NextResponse.json({ error: "ID de afiliado inválido" }, { status: 400 })
    }

    const { newPassword } = await request.json()

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "A nova senha deve ter pelo menos 6 caracteres." }, { status: 400 })
    }

    // Get the user associated with the affiliate ID
    const affiliateUser = await getUserById(affiliateId)
    if (!affiliateUser) {
      return NextResponse.json({ error: "Usuário afiliado não encontrado." }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await updateUserPasswordHash(affiliateUser.id, hashedPassword)

    return NextResponse.json({
      success: true,
      message: `Senha do afiliado ${affiliateUser.email} atualizada com sucesso.`,
    })
  } catch (error) {
    console.error("Erro ao alterar senha do afiliado:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor ao alterar senha",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
