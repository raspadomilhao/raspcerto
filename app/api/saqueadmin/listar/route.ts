import { NextResponse } from "next/server"
import { sql } from "@/lib/database"

export async function GET() {
  try {
    // Buscar todas as solicitações de saque com chave PIX e status específicos
    const requests = await sql`
      SELECT 
        t.id,
        t.user_id,
        t.amount,
        t.status,
        t.created_at,
        t.pix_key,
        t.pix_type,
        u.name as user_name,
        u.email as user_email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type = 'withdraw' 
        AND t.pix_key IS NOT NULL 
        AND t.status IN ('pending', 'approved', 'rejected')
      ORDER BY t.created_at DESC
    `

    // Calcular estatísticas
    const [statsResult] = await sql`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM transactions 
      WHERE type = 'withdraw' 
        AND pix_key IS NOT NULL 
        AND status IN ('pending', 'approved', 'rejected')
    `

    const stats = {
      total_requests: Number(statsResult.total_requests) || 0,
      pending_requests: Number(statsResult.pending_requests) || 0,
      total_amount: Number(statsResult.total_amount) || 0,
      pending_amount: Number(statsResult.pending_amount) || 0,
    }

    return NextResponse.json({
      requests: requests || [],
      stats,
    })
  } catch (error) {
    console.error("Erro ao buscar solicitações de saque:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
