import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { getUserByUsername, updateWalletBalance, createTransaction } from "@/lib/database"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "horsepay-secret-key")

async function verifyAdminAuth(request: NextRequest) {
  try {
    const token = request.cookies.get("admin-token")?.value
    if (!token) return false

    const { payload } = await jwtVerify(token, secret)
    return payload.isAdmin === true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request)
    if (!isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { username, amount, reason } = await request.json()

    if (!username || !amount || amount <= 0) {
      return NextResponse.json({ error: "Username e valor são obrigatórios" }, { status: 400 })
    }

    // Buscar usuário por username
    const user = await getUserByUsername(username)
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Adicionar saldo à carteira
    const updatedWallet = await updateWalletBalance(user.id, amount, "add")

    // Criar registro de transação administrativa
    await createTransaction({
      user_id: user.id,
      type: "deposit",
      amount: amount,
      status: "success",
      payer_name: "Administrador",
      callback_url: null,
      external_id: null,
      end_to_end_id: null,
      pix_key: null,
      pix_type: null,
      qr_code: null,
      copy_paste_code: `ADMIN_CREDIT_${Date.now()}`,
    })

    return NextResponse.json({
      success: true,
      message: `R$ ${amount.toFixed(2)} adicionado ao saldo de ${user.name} (@${username})`,
      new_balance: updatedWallet.balance,
    })
  } catch (error) {
    console.error("Erro ao adicionar saldo:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
