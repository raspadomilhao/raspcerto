import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { sql } from "@/lib/database"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "horsepay-secret-key")

async function getUserFromRequest(request: NextRequest) {
  let token = request.cookies.get("auth-token")?.value

  if (!token) {
    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    throw new Error("Token não encontrado")
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.userId as number
  } catch (error) {
    throw new Error("Token inválido")
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)

    // Buscar apenas saques com chave PIX e status específicos (pending, approved, rejected)
    const withdrawals = await sql`
      SELECT id, amount, pix_key, pix_type, status, created_at
      FROM transactions 
      WHERE user_id = ${userId} 
        AND type = 'withdraw' 
        AND pix_key IS NOT NULL 
        AND status IN ('pending', 'approved', 'rejected')
      ORDER BY created_at DESC
    `

    return NextResponse.json(withdrawals)
  } catch (error) {
    console.error("Erro ao buscar histórico de saques:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
