import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"

export async function GET() {
  try {
    console.log("🔧 Buscando configurações do sistema...")

    // Buscar configurações atuais
    const [settings] = await sql`
      SELECT * FROM settings WHERE id = 1
    `

    if (!settings) {
      // Se não existir, criar configurações padrão
      const [newSettings] = await sql`
        INSERT INTO settings (id, min_deposit, max_deposit, min_withdraw, max_withdraw)
        VALUES (1, 1.00, 10000.00, 10.00, 5000.00)
        RETURNING *
      `

      console.log("✅ Configurações padrão criadas:", newSettings)

      return NextResponse.json({
        success: true,
        settings: newSettings,
      })
    }

    console.log("✅ Configurações encontradas:", settings)

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar configurações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { min_deposit, max_deposit, min_withdraw, max_withdraw } = body

    console.log("🔧 Atualizando configurações:", body)

    // Validações
    if (!min_deposit || !max_deposit || !min_withdraw || !max_withdraw) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    if (min_deposit <= 0 || max_deposit <= 0 || min_withdraw <= 0 || max_withdraw <= 0) {
      return NextResponse.json({ error: "Todos os valores devem ser maiores que zero" }, { status: 400 })
    }

    if (min_deposit >= max_deposit) {
      return NextResponse.json({ error: "O valor mínimo de depósito deve ser menor que o máximo" }, { status: 400 })
    }

    if (min_withdraw >= max_withdraw) {
      return NextResponse.json({ error: "O valor mínimo de saque deve ser menor que o máximo" }, { status: 400 })
    }

    // Atualizar configurações
    const [updatedSettings] = await sql`
      INSERT INTO settings (id, min_deposit, max_deposit, min_withdraw, max_withdraw, updated_at)
      VALUES (1, ${min_deposit}, ${max_deposit}, ${min_withdraw}, ${max_withdraw}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        min_deposit = ${min_deposit},
        max_deposit = ${max_deposit},
        min_withdraw = ${min_withdraw},
        max_withdraw = ${max_withdraw},
        updated_at = NOW()
      RETURNING *
    `

    console.log("✅ Configurações atualizadas:", updatedSettings)

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: "Configurações atualizadas com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao atualizar configurações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
