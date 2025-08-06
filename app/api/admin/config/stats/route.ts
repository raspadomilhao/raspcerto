import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Função separada para consultar saldo HorsePay
async function getHorsePayBalance(): Promise<{ balance: number; error: string | null }> {
  try {
    // Verificar se as credenciais estão configuradas
    if (!process.env.HORSEPAY_CLIENT_KEY || !process.env.HORSEPAY_CLIENT_SECRET) {
      return { balance: 0, error: "Credenciais HorsePay não configuradas" }
    }

    console.log("🔑 Autenticando com HorsePay...")

    // Primeiro, autenticar para obter o token
    const authResponse = await fetch("https://api.horsepay.io/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_key: process.env.HORSEPAY_CLIENT_KEY,
        client_secret: process.env.HORSEPAY_CLIENT_SECRET,
      }),
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error("❌ Erro na autenticação HorsePay:", authResponse.status, errorText.substring(0, 200))
      return { balance: 0, error: `Erro de autenticação: ${authResponse.status}` }
    }

    let authData
    try {
      const responseText = await authResponse.text()
      console.log("🔍 Resposta de autenticação HorsePay:", responseText.substring(0, 300))
      authData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("❌ Erro ao fazer parse da resposta de autenticação:", parseError)
      return { balance: 0, error: "Resposta de autenticação inválida" }
    }

    // Verificar diferentes possíveis nomes de campo para o token
    const token = authData.access_token || authData.token || authData.accessToken || authData.bearer_token

    if (!token) {
      console.error("❌ Token não encontrado na resposta de autenticação. Campos disponíveis:", Object.keys(authData))
      return { balance: 0, error: "Token não encontrado na resposta" }
    }

    console.log("✅ Token obtido com sucesso")
    console.log("💰 Consultando saldo...")

    // Agora consultar o saldo
    const balanceResponse = await fetch("https://api.horsepay.io/user/balance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text()
      console.error("❌ Erro ao consultar saldo HorsePay:", balanceResponse.status, errorText.substring(0, 200))
      return { balance: 0, error: `Erro na consulta de saldo: ${balanceResponse.status}` }
    }

    let balanceData
    try {
      const responseText = await balanceResponse.text()
      console.log("🔍 Resposta de saldo HorsePay:", responseText.substring(0, 300))
      balanceData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("❌ Erro ao fazer parse da resposta de saldo:", parseError)
      return { balance: 0, error: "Resposta de saldo inválida" }
    }

    // Verificar diferentes possíveis nomes de campo para o saldo
    const balance = balanceData.balance || balanceData.amount || balanceData.available_balance || 0

    console.log("✅ Saldo consultado com sucesso:", balance)
    return { balance: Number(balance) || 0, error: null }
  } catch (error) {
    console.error("💥 Erro geral ao consultar saldo HorsePay:", error)
    return {
      balance: 0,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

export async function GET() {
  try {
    const primaryClientKey = process.env.HORSEPAY_CLIENT_KEY

    // Consultar saldo da HorsePay de forma independente
    console.log("🔍 Consultando saldo HorsePay...")
    const horsePayResult = await getHorsePayBalance()

    if (horsePayResult.error) {
      console.warn("⚠️ Erro ao consultar HorsePay:", horsePayResult.error)
    } else {
      console.log("✅ Saldo HorsePay obtido:", horsePayResult.balance)
    }

    // Estatísticas de usuários (excluindo bloggers)
    const usersStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN user_type != 'blogger' THEN 1 END) as regular_users,
        COUNT(CASE WHEN user_type = 'blogger' THEN 1 END) as blogger_users,
        COUNT(CASE WHEN u.created_at >= CURRENT_DATE AND user_type != 'blogger' THEN 1 END) as active_today,
        COUNT(CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '7 days' AND user_type != 'blogger' THEN 1 END) as new_this_week
      FROM users u
    `

    // Estatísticas de transações (excluindo bloggers e filtrando por client_key primária)
    const transactionsStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN t.status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed,
        COALESCE(SUM(t.amount), 0) as total_volume,
        COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'success' THEN t.amount ELSE 0 END), 0) as deposits_volume,
        COALESCE(SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'success' THEN t.amount ELSE 0 END), 0) as withdraws_volume
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE u.user_type != 'blogger'
      AND (u.client_key = ${primaryClientKey} OR u.client_key IS NULL)
    `

    // Lista detalhada de transações de depósito e saque (excluindo bloggers e filtrando por client_key primária)
    const detailedTransactions = await sql`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.status,
        t.external_id,
        t.end_to_end_id,
        t.payer_name,
        t.pix_key,
        t.pix_type,
        t.created_at,
        t.updated_at,
        u.id as user_id,
        u.name as user_name,
        u.username as user_username,
        u.email as user_email,
        u.user_type,
        COALESCE(w.balance, 0) as user_balance
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE t.type IN ('deposit', 'withdraw')
      AND u.user_type != 'blogger'
      AND (u.client_key = ${primaryClientKey} OR u.client_key IS NULL)
      ORDER BY t.created_at DESC
      LIMIT 100
    `

    // Estatísticas detalhadas por tipo de transação (filtrando por client_key primária)
    const transactionsByType = await sql`
      SELECT 
        t.type,
        t.status,
        COUNT(*) as count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COALESCE(AVG(t.amount), 0) as avg_amount,
        MIN(t.created_at) as first_transaction,
        MAX(t.created_at) as last_transaction
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type IN ('deposit', 'withdraw')
      AND u.user_type != 'blogger'
      AND (u.client_key = ${primaryClientKey} OR u.client_key IS NULL)
      GROUP BY t.type, t.status
      ORDER BY t.type, t.status
    `

    // Estatísticas de jogos (excluindo bloggers)
    const gamesStats = await sql`
      SELECT 
        COUNT(CASE WHEN t.type = 'game_play' THEN 1 END) as total_plays,
        COALESCE(SUM(CASE WHEN t.type = 'game_play' THEN ABS(t.amount) ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN t.type = 'game_prize' THEN t.amount ELSE 0 END), 0) as total_won
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type IN ('game_play', 'game_prize')
      AND u.user_type != 'blogger'
    `

    // Breakdown por jogo (excluindo bloggers)
    const gamesBreakdown = await sql`
      SELECT 
        CASE 
          WHEN ABS(t.amount) = 1.00 THEN 'Raspe da Esperança'
          WHEN ABS(t.amount) = 3.00 THEN 'Fortuna Dourada'
          WHEN ABS(t.amount) = 5.00 THEN 'Mega Sorte'
          ELSE 'Outros'
        END as game_type,
        COUNT(CASE WHEN t.type = 'game_play' THEN 1 END) as plays,
        COALESCE(SUM(CASE WHEN t.type = 'game_play' THEN ABS(t.amount) ELSE 0 END), 0) as spent,
        COALESCE(SUM(CASE WHEN t.type = 'game_prize' THEN t.amount ELSE 0 END), 0) as won,
        COALESCE(SUM(CASE WHEN t.type = 'game_play' THEN ABS(t.amount) ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.type = 'game_prize' THEN t.amount ELSE 0 END), 0) as profit
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type IN ('game_play', 'game_prize')
      AND u.user_type != 'blogger'
      GROUP BY 
        CASE 
          WHEN ABS(t.amount) = 1.00 THEN 'Raspe da Esperança'
          WHEN ABS(t.amount) = 3.00 THEN 'Fortuna Dourada'
          WHEN ABS(t.amount) = 5.00 THEN 'Mega Sorte'
          ELSE 'Outros'
        END
      HAVING COUNT(CASE WHEN t.type = 'game_play' THEN 1 END) > 0
    `

    // Estatísticas financeiras (excluindo bloggers e filtrando por client_key primária)
    const financialStats = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'success' THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'success' THEN t.amount ELSE 0 END), 0) as platform_balance,
        COALESCE(SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'pending' THEN t.amount ELSE 0 END), 0) as pending_withdraws
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE u.user_type != 'blogger'
      AND (u.client_key = ${primaryClientKey} OR u.client_key IS NULL)
    `

    // Receitas por período (excluindo bloggers)
    const revenueStats = await sql`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN t.type = 'game_play' AND t.created_at >= CURRENT_DATE 
          THEN ABS(t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE 
          WHEN t.type = 'game_prize' AND t.created_at >= CURRENT_DATE 
          THEN t.amount ELSE 0 END), 0) as daily_revenue,
        
        COALESCE(SUM(CASE 
          WHEN t.type = 'game_play' AND t.created_at >= CURRENT_DATE - INTERVAL '7 days' 
          THEN ABS(t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE 
          WHEN t.type = 'game_prize' AND t.created_at >= CURRENT_DATE - INTERVAL '7 days' 
          THEN t.amount ELSE 0 END), 0) as weekly_revenue,
        
        COALESCE(SUM(CASE 
          WHEN t.type = 'game_play' AND t.created_at >= CURRENT_DATE - INTERVAL '30 days' 
          THEN ABS(t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE 
          WHEN t.type = 'game_prize' AND t.created_at >= CURRENT_DATE - INTERVAL '30 days' 
          THEN t.amount ELSE 0 END), 0) as monthly_revenue
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type IN ('game_play', 'game_prize')
      AND u.user_type != 'blogger'
    `

    // Atividades recentes (excluindo bloggers e filtrando por client_key primária para depósitos/saques)
    const recentActivities = await sql`
      SELECT 
        t.id,
        CASE 
          WHEN t.type = 'deposit' THEN 'deposit'
          WHEN t.type = 'withdraw' THEN 'withdraw'
          WHEN t.type = 'game_play' THEN 'game'
          WHEN t.type = 'game_prize' THEN 'game'
          ELSE 'transaction'
        END as type,
        CASE 
          WHEN t.type = 'deposit' THEN 'Depósito realizado'
          WHEN t.type = 'withdraw' THEN 'Saque solicitado'
          WHEN t.type = 'game_play' THEN CONCAT('Jogou ', 
            CASE 
              WHEN ABS(t.amount) = 1.00 THEN 'Raspe da Esperança'
              WHEN ABS(t.amount) = 3.00 THEN 'Fortuna Dourada'
              WHEN ABS(t.amount) = 5.00 THEN 'Mega Sorte'
              ELSE 'jogo'
            END)
          WHEN t.type = 'game_prize' THEN CONCAT('Ganhou prêmio de ', 
            CASE 
              WHEN t.amount = 1.00 THEN 'Raspe da Esperança'
              WHEN t.amount = 3.00 THEN 'Fortuna Dourada'
              WHEN t.amount = 5.00 THEN 'Mega Sorte'
              ELSE 'jogo'
            END)
          ELSE 'Transação'
        END as description,
        t.amount,
        u.email as user_email,
        t.created_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.created_at >= CURRENT_DATE - INTERVAL '24 hours'
      AND u.user_type != 'blogger'
      AND (
        (t.type IN ('deposit', 'withdraw') AND (u.client_key = ${primaryClientKey} OR u.client_key IS NULL)) OR
        (t.type IN ('game_play', 'game_prize'))
      )
      ORDER BY t.created_at DESC
      LIMIT 20
    `

    // Calcular margem de lucro dos jogos
    const totalSpent = Number.parseFloat(gamesStats[0]?.total_spent || "0")
    const totalWon = Number.parseFloat(gamesStats[0]?.total_won || "0")
    const profitMargin = totalSpent > 0 ? ((totalSpent - totalWon) / totalSpent) * 100 : 0

    // Calcular saldo disponível
    const platformBalance = Number.parseFloat(financialStats[0]?.platform_balance || "0")
    const pendingWithdraws = Number.parseFloat(financialStats[0]?.pending_withdraws || "0")
    const availableBalance = platformBalance - pendingWithdraws

    // Formatar breakdown dos jogos
    const gamesBreakdownFormatted = gamesBreakdown.reduce((acc: any, game: any) => {
      acc[game.game_type] = {
        plays: Number.parseInt(game.plays),
        spent: Number.parseFloat(game.spent),
        won: Number.parseFloat(game.won),
        profit: Number.parseFloat(game.profit),
      }
      return acc
    }, {})

    // Formatar estatísticas por tipo de transação
    const transactionsByTypeFormatted = transactionsByType.reduce((acc: any, item: any) => {
      if (!acc[item.type]) {
        acc[item.type] = {}
      }
      acc[item.type][item.status] = {
        count: Number.parseInt(item.count),
        total_amount: Number.parseFloat(item.total_amount),
        avg_amount: Number.parseFloat(item.avg_amount),
        first_transaction: item.first_transaction,
        last_transaction: item.last_transaction,
      }
      return acc
    }, {})

    const stats = {
      users: {
        total: Number.parseInt(usersStats[0]?.regular_users || "0"), // Apenas usuários regulares
        blogger_count: Number.parseInt(usersStats[0]?.blogger_users || "0"), // Contagem de bloggers separada
        active_today: Number.parseInt(usersStats[0]?.active_today || "0"),
        new_this_week: Number.parseInt(usersStats[0]?.new_this_week || "0"),
      },
      transactions: {
        total: Number.parseInt(transactionsStats[0]?.total || "0"),
        successful: Number.parseInt(transactionsStats[0]?.successful || "0"),
        pending: Number.parseInt(transactionsStats[0]?.pending || "0"),
        failed: Number.parseInt(transactionsStats[0]?.failed || "0"),
        total_volume: Number.parseFloat(transactionsStats[0]?.total_volume || "0"),
        deposits_volume: Number.parseFloat(transactionsStats[0]?.deposits_volume || "0"),
        withdraws_volume: Number.parseFloat(transactionsStats[0]?.withdraws_volume || "0"),
        detailed_list: detailedTransactions.map((transaction: any) => ({
          id: transaction.id,
          type: transaction.type,
          amount: Number.parseFloat(transaction.amount),
          status: transaction.status,
          external_id: transaction.external_id,
          end_to_end_id: transaction.end_to_end_id,
          payer_name: transaction.payer_name,
          pix_key: transaction.pix_key,
          pix_type: transaction.pix_type,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at,
          user: {
            id: transaction.user_id,
            name: transaction.user_name,
            username: transaction.user_username,
            email: transaction.user_email,
            user_type: transaction.user_type,
            balance: Number.parseFloat(transaction.user_balance),
          },
        })),
        by_type: transactionsByTypeFormatted,
      },
      games: {
        total_plays: Number.parseInt(gamesStats[0]?.total_plays || "0"),
        total_spent: totalSpent,
        total_won: totalWon,
        profit_margin: profitMargin,
        games_breakdown: gamesBreakdownFormatted,
      },
      financial: {
        platform_balance: platformBalance,
        pending_withdraws: pendingWithdraws,
        available_balance: availableBalance,
        horsepay_balance: horsePayResult.balance,
        horsepay_error: horsePayResult.error,
        daily_revenue: Number.parseFloat(revenueStats[0]?.daily_revenue || "0"),
        weekly_revenue: Number.parseFloat(revenueStats[0]?.weekly_revenue || "0"),
        monthly_revenue: Number.parseFloat(revenueStats[0]?.monthly_revenue || "0"),
      },
      recent_activities: recentActivities.map((activity: any) => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        amount: activity.amount ? Number.parseFloat(activity.amount) : null,
        user_email: activity.user_email,
        created_at: activity.created_at,
      })),
    }

    console.log("✅ Estatísticas compiladas com sucesso")
    return NextResponse.json(stats)
  } catch (error) {
    console.error("💥 Erro ao buscar estatísticas administrativas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
