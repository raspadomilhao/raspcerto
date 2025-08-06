import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { getUserById, getUserWallet } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    console.log("👤 Buscando perfil do usuário...")

    const auth = await verifyAuth(request)
    if (!auth) {
      console.log("❌ Usuário não autenticado")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log(`✅ Usuário autenticado: ${auth.userId}`)

    // Buscar dados do usuário
    const user = await getUserById(auth.userId)
    if (!user) {
      console.log("❌ Usuário não encontrado")
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Buscar carteira do usuário
    const wallet = await getUserWallet(auth.userId)
    if (!wallet) {
      console.log("❌ Carteira não encontrada")
      return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 })
    }

    const profile = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        phone: user.phone,
        user_type: user.user_type || "regular",
        created_at: user.created_at,
      },
      wallet: {
        balance: Number.parseFloat(wallet.balance.toString()),
      },
    }

    console.log(`✅ Perfil encontrado: ${user.email} - Saldo: R$ ${profile.wallet.balance}`)

    return NextResponse.json(profile)
  } catch (error) {
    console.error("❌ Erro ao buscar perfil:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
