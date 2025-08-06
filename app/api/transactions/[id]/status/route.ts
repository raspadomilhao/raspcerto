import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ success: false, error: "ID da transação é obrigatório" }, { status: 400 })
    }

    // Buscar a transação pelo external_id
    const transactions = await sql`
      SELECT 
        t.*,
        w.balance as user_balance
      FROM transactions t
      LEFT JOIN wallets w ON t.user_id = w.user_id
      WHERE t.external_id = ${id}
      ORDER BY t.created_at DESC
      LIMIT 1
    `

    if (transactions.length === 0) {
      return NextResponse.json({ success: false, error: "Transação não encontrada" }, { status: 404 })
    }

    const transaction = transactions[0]

    return NextResponse.json({
      success: true,
      data: {
        id: transaction.id,
        external_id: transaction.external_id,
        status: transaction.status,
        amount: transaction.amount,
        user_balance: transaction.user_balance,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
      },
    })
  } catch (error) {
    console.error("Erro ao verificar status da transação:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
