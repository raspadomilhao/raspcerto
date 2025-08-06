import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { getAllUsersWithBalance } from "@/lib/database"

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

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request)
    if (!isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const users = await getAllUsersWithBalance()
    return NextResponse.json(users)
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
