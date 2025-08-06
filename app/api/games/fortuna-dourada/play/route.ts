import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const GAME_PRICE = 3.0

export async function POST(request: NextRequest) {
  try {
    console.log("🎮 === JOGO FORTUNA DOURADA ===")

    // 1. Verificar autenticação
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log(`👤 Usuário: ${auth.userId} (${auth.userType})`)

    // 2. Parse do body da requisição
    let gameResult
    try {
      const body = await request.json()
      gameResult = body.gameResult
      console.log("📦 Dados recebidos do frontend:", body)
    } catch (error) {
      console.error("❌ Erro ao fazer parse do JSON:", error)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    if (!gameResult) {
      console.log("❌ gameResult não fornecido")
      return NextResponse.json({ error: "Resultado do jogo não fornecido" }, { status: 400 })
    }

    // 3. Buscar saldo atual
    const [wallet] = await sql`
      SELECT balance FROM wallets WHERE user_id = ${auth.userId}
    `

    if (!wallet) {
      return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 })
    }

    const currentBalance = Number.parseFloat(wallet.balance.toString())
    console.log(`💰 Saldo atual: R$ ${currentBalance.toFixed(2)}`)

    // 4. Verificar saldo suficiente
    if (currentBalance < GAME_PRICE) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 })
    }

    // 5. Usar o resultado do frontend (hasWon e prizeAmount)
    const hasWon = gameResult.hasWon || false
    let prizeAmount = 0

    if (hasWon) {
      // Usar o valor do prêmio calculado pelo frontend
      prizeAmount = Number.parseFloat(gameResult.prizeAmount) || 0
      console.log(`🏆 Frontend disse que ganhou: R$ ${prizeAmount.toFixed(2)}`)
    } else {
      console.log("💔 Frontend disse que não ganhou")
    }

    // 6. Processar transações
    try {
      // Debitar aposta
      await sql`
        INSERT INTO transactions (user_id, type, amount, status, created_at)
        VALUES (${auth.userId}, 'game_play', ${-GAME_PRICE}, 'completed', NOW())
      `
      console.log(`💸 Debitado: R$ ${GAME_PRICE.toFixed(2)}`)

      // Calcular novo saldo após débito
      let newBalance = currentBalance - GAME_PRICE
      console.log(`💰 Saldo após débito: R$ ${newBalance.toFixed(2)}`)

      // Se ganhou prêmio, creditar
      if (prizeAmount > 0) {
        await sql`
          INSERT INTO transactions (user_id, type, amount, status, created_at)
          VALUES (${auth.userId}, 'game_prize', ${prizeAmount}, 'completed', NOW())
        `
        console.log(`💰 Creditado: R$ ${prizeAmount.toFixed(2)}`)
        newBalance += prizeAmount
      }

      // Calcular resultado líquido
      const netResult = prizeAmount - GAME_PRICE
      console.log(`📊 Resultado líquido: R$ ${netResult.toFixed(2)} (${netResult >= 0 ? "LUCRO" : "PERDA"})`)

      // Atualizar carteira (removido o código que setava saldo fixo para bloggers)
      await sql`
        UPDATE wallets 
        SET balance = ${newBalance}, updated_at = NOW()
        WHERE user_id = ${auth.userId}
      `

      console.log(`✅ Novo saldo: R$ ${newBalance.toFixed(2)}`)

      // 7. Preparar mensagem baseada no resultado
      let message = ""
      if (prizeAmount === 0) {
        message = "Que pena! Você não ganhou nada desta vez."
      } else if (netResult < 0) {
        message = `Você ganhou R$ ${prizeAmount.toFixed(2)}, mas perdeu R$ ${Math.abs(netResult).toFixed(2)} no total.`
      } else if (netResult === 0) {
        message = `Você ganhou R$ ${prizeAmount.toFixed(2)} e empatou!`
      } else {
        message = `Parabéns! Você ganhou R$ ${prizeAmount.toFixed(2)} e lucrou R$ ${netResult.toFixed(2)}!`
      }

      // 8. Retornar resultado no formato esperado pelo frontend
      return NextResponse.json({
        success: true,
        gameResult: {
          hasWon: prizeAmount > 0,
          prizeAmount: prizeAmount,
        },
        newBalance: newBalance,
        message: message,
        debug: {
          balanceBefore: currentBalance,
          gamePrice: GAME_PRICE,
          prize: prizeAmount,
          netResult: netResult,
          balanceAfter: newBalance,
          userType: auth.userType,
        },
      })
    } catch (error) {
      console.error("❌ Erro nas transações:", error)
      return NextResponse.json({ error: "Erro ao processar jogo" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ Erro geral:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
