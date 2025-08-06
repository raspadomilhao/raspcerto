import { type NextRequest, NextResponse } from "next/server"
import {
  createWebhookLog,
  getUserWallet,
  sql, // Importa o cliente sql para transações
} from "@/lib/database" // Importa 'sql' do seu módulo de banco de dados
import { processReferralConversion, processReferralDeposit } from "@/lib/affiliate-database"

interface DepositCallback {
  external_id: number
  status: "success" | "pending" | "failed" | "true" | "false" | "check"
  amount?: number
  payer_name?: string
  end_to_end_id?: string
}

interface WithdrawCallback {
  external_id: number
  end_to_end_id: string
  status: "success" | "refunded" | "pending" | "true" | "false"
  amount: number
}

type WebhookPayload = DepositCallback | WithdrawCallback

// Função para normalizar o status (HorsePay usa "true"/"false")
function normalizeStatus(status: string | boolean): string {
  console.log(`🔄 Normalizando status: ${status} (tipo: ${typeof status})`)

  if (status === "true" || status === true) {
    console.log(`✅ Status "true" detectado - convertendo para "success"`)
    return "success"
  }
  if (status === "false" || status === false) {
    console.log(`❌ Status "false" detectado - convertendo para "failed"`)
    return "failed"
  }

  console.log(`📝 Status mantido como: ${status}`)
  return status.toString()
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()

    console.log("🔔 Webhook HorsePay recebido:", JSON.stringify(payload, null, 2))
    console.log(`📝 Status recebido: "${payload.status}" (${typeof payload.status})`)

    // Se for uma verificação de status, apenas consultar o banco
    if (payload.status === "check") {
      console.log(`🔍 Verificação de status para external_id: ${payload.external_id}`)

      try {
        const [transaction] = await sql`
          SELECT * FROM transactions WHERE external_id = ${payload.external_id}
        `

        if (!transaction) {
          return NextResponse.json({
            success: false,
            message: "Transação não encontrada",
            payment_confirmed: false,
          })
        }

        const isConfirmed = transaction.status === "success"
        console.log(`📊 Status da transação ${payload.external_id}: ${transaction.status} (confirmado: ${isConfirmed})`)

        return NextResponse.json({
          success: true,
          message: "Status verificado",
          payment_confirmed: isConfirmed,
          status: transaction.status,
          external_id: payload.external_id,
        })
      } catch (error) {
        console.error("❌ Erro ao verificar status:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Erro ao verificar status",
            payment_confirmed: false,
          },
          { status: 500 },
        )
      }
    }

    // Determinar o tipo de callback
    const isWithdraw = "end_to_end_id" in payload && payload.end_to_end_id
    const type = isWithdraw ? "withdraw" : "deposit"

    console.log(`📝 Tipo de webhook identificado: ${type}`)

    let processed = false
    let errorMessage = ""

    try {
      // Processar o webhook baseado no tipo
      if (type === "deposit") {
        console.log("💰 Processando callback de depósito...")
        await processDepositCallback(payload as DepositCallback)
      } else {
        console.log("💸 Processando callback de saque...")
        await processWithdrawCallback(payload as WithdrawCallback)
      }
      processed = true
      console.log("✅ Webhook processado com sucesso!")
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error)
      errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
    }

    // Salvar log do webhook no banco
    const webhookLog = await createWebhookLog({
      type,
      external_id: payload.external_id,
      payload,
      processed,
      error_message: errorMessage || undefined,
    })

    console.log(`📊 Log do webhook salvo com ID: ${webhookLog.id}`)

    return NextResponse.json({
      success: processed,
      message: processed ? "Webhook processado com sucesso" : "Erro ao processar webhook",
      webhook_id: webhookLog.id,
      status: payload.status,
      error: errorMessage || undefined,
    })
  } catch (error) {
    console.error("💥 Erro crítico no webhook:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

async function processDepositCallback(payload: DepositCallback) {
  console.log(`🔍 Processando callback de depósito:`, JSON.stringify(payload, null, 2))

  // Validar dados obrigatórios
  if (!payload.external_id) {
    throw new Error("external_id é obrigatório")
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new Error("amount deve ser maior que zero")
  }

  if (!payload.status) {
    throw new Error("status é obrigatório")
  }

  // Buscar a transação no banco
  console.log(`🔎 Buscando transação com external_id: ${payload.external_id}`)
  const [transaction] = await sql`
    SELECT * FROM transactions WHERE external_id = ${payload.external_id}
  `

  if (!transaction) {
    const errorMsg = `Transação com external_id ${payload.external_id} não encontrada`
    console.error(`❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  console.log(`📋 Transação encontrada:`, JSON.stringify(transaction, null, 2))

  // 💰 LÓGICA DE ABSORÇÃO DE TAXA
  const originalAmount = Number.parseFloat(transaction.amount.toString()) // Valor que o usuário solicitou
  const webhookAmount = payload.amount // Valor líquido que a HorsePay enviou
  const absorvedFee = originalAmount - webhookAmount // Taxa absorvida pela empresa

  console.log(`💰 ABSORÇÃO DE TAXA:`)
  console.log(`💰 Valor solicitado pelo usuário: R$ ${originalAmount.toFixed(2)}`)
  console.log(`💰 Valor líquido da HorsePay: R$ ${webhookAmount.toFixed(2)}`)
  console.log(`💰 Taxa absorvida pela empresa: R$ ${absorvedFee.toFixed(2)}`)
  console.log(`💰 Usuário receberá: R$ ${originalAmount.toFixed(2)} (valor integral!)`)

  // Normalizar o status
  const normalizedStatus = normalizeStatus(payload.status)
  console.log(`📝 Status original: ${payload.status} → Status normalizado: ${normalizedStatus}`)

  if (normalizedStatus === "success") {
    // Verificar se já foi processada
    if (transaction.status === "success") {
      console.log(`⚠️ Transação ${payload.external_id} já processada. Ignorando.`)
      return
    }

    console.log(`🎉 DEPÓSITO APROVADO! Creditando valor INTEGRAL: R$ ${originalAmount}`)

    try {
      // 1. Atualizar status da transação
      console.log(`📝 Atualizando status da transação...`)
      await sql`
        UPDATE transactions
        SET status = ${normalizedStatus}, 
            end_to_end_id = COALESCE(${payload.end_to_end_id || null}, end_to_end_id)
        WHERE external_id = ${payload.external_id}
      `

      // 2. Creditar o VALOR ORIGINAL na carteira (não o valor do webhook)
      console.log(
        `💰 Creditando valor ORIGINAL: R$ ${originalAmount} (absorvendo taxa de R$ ${absorvedFee.toFixed(2)})`,
      )
      await sql`
        INSERT INTO wallets (user_id, balance)
        VALUES (${transaction.user_id}, ${originalAmount})
        ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + ${originalAmount}
      `

      console.log(`🎉 Sucesso! Valor integral creditado ao usuário!`)

      // Verificar saldo final
      const walletAfter = await getUserWallet(transaction.user_id)
      console.log(`💰 Novo saldo: R$ ${walletAfter?.balance || 0}`)

      // Log para controle interno
      console.log(`📊 RESUMO FINANCEIRO:`)
      console.log(`📊 Receita bruta: R$ ${originalAmount.toFixed(2)}`)
      console.log(`📊 Taxa HorsePay: R$ ${absorvedFee.toFixed(2)}`)
      console.log(`📊 Receita líquida: R$ ${webhookAmount.toFixed(2)}`)
      console.log(`📊 Margem: ${absorvedFee > 0 ? `-R$ ${absorvedFee.toFixed(2)}` : "Positiva"}`)

      // NOVO: Processar comissão de afiliado
      try {
        console.log(`🔗 Verificando referência para usuário ${transaction.user_id}`)

        // Verificar se é o primeiro depósito
        const [firstDepositCheck] = await sql`
          SELECT COUNT(*) as deposit_count
          FROM transactions 
          WHERE user_id = ${transaction.user_id} 
          AND type = 'deposit' 
          AND status = 'success'
        `

        const isFirstDeposit = Number(firstDepositCheck.deposit_count) <= 1 // Incluindo o atual

        if (isFirstDeposit) {
          console.log(`🎉 Primeiro depósito detectado para usuário ${transaction.user_id}`)
          await processReferralConversion(transaction.user_id, originalAmount, transaction.id)
          console.log(`✅ Comissão do primeiro depósito processada`)
        } else {
          console.log(`💰 Depósito adicional para usuário ${transaction.user_id}`)
          await processReferralDeposit(transaction.user_id, originalAmount, transaction.id)
          console.log(`✅ Comissão do depósito adicional processada`)
        }
      } catch (affiliateError) {
        console.error("❌ Erro ao processar comissão de afiliado:", affiliateError)
        // Não falhar o webhook por causa da comissão
      }

      // NOVO: Processar comissão de gerente
      try {
        console.log(`🔗 Verificando se agente tem gerente`)

        // Buscar se o agente tem um gerente
        const [agentWithManager] = await sql`
          SELECT a.manager_id, m.commission_rate
          FROM agents a
          LEFT JOIN managers m ON a.manager_id = m.id
          WHERE a.user_id = (
            SELECT user_id FROM affiliates WHERE id = (
              SELECT affiliate_id FROM referrals WHERE referred_user_id = ${transaction.user_id} LIMIT 1
            )
          )
          AND m.status = 'active'
          LIMIT 1
        `

        if (agentWithManager && agentWithManager.manager_id) {
          console.log(`🎯 Gerente encontrado: ${agentWithManager.manager_id}`)

          // Importar função de processamento de comissão de gerente
          const { processManagerCommission } = await import("@/lib/manager-database")

          // Buscar IDs necessários
          const [referralData] = await sql`
            SELECT r.affiliate_id, af.agent_id
            FROM referrals r
            JOIN affiliates af ON r.affiliate_id = af.id
            WHERE r.referred_user_id = ${transaction.user_id}
            LIMIT 1
          `

          if (referralData) {
            await processManagerCommission(
              agentWithManager.manager_id,
              referralData.agent_id,
              referralData.affiliate_id,
              transaction.id,
              originalAmount,
            )
            console.log(`✅ Comissão de gerente processada`)
          }
        } else {
          console.log(`ℹ️ Agente não tem gerente ou gerente inativo`)
        }
      } catch (managerError) {
        console.error("❌ Erro ao processar comissão de gerente:", managerError)
        // Não falhar o webhook por causa da comissão de gerente
      }
    } catch (error) {
      console.error(`❌ Erro ao processar depósito:`, error)
      throw new Error(`Erro ao creditar saldo: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  } else if (normalizedStatus === "failed") {
    console.log(`❌ Depósito falhou`)
    await sql`
      UPDATE transactions
      SET status = ${normalizedStatus}
      WHERE external_id = ${payload.external_id}
    `
  } else {
    console.log(`⏳ Status: ${normalizedStatus}`)
  }
}

async function processWithdrawCallback(payload: WithdrawCallback) {
  console.log(`🔍 Processando callback de saque:`, JSON.stringify(payload, null, 2))

  // Validar dados obrigatórios
  if (!payload.external_id) {
    throw new Error("external_id é obrigatório")
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new Error("amount deve ser maior que zero")
  }

  if (!payload.status) {
    throw new Error("status é obrigatório")
  }

  // Buscar a transação no banco
  console.log(`🔎 Buscando transação com external_id: ${payload.external_id}`)
  const [transaction] = await sql`
    SELECT * FROM transactions WHERE external_id = ${payload.external_id}
  `

  if (!transaction) {
    const errorMsg = `Transação com external_id ${payload.external_id} não encontrada`
    console.error(`❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  console.log(`📋 Transação encontrada:`, JSON.stringify(transaction, null, 2))

  // Atualizar status da transação
  console.log(`📝 Atualizando status da transação para: ${payload.status}`)
  await sql`
    UPDATE transactions 
    SET status = ${payload.status}, end_to_end_id = COALESCE(${payload.end_to_end_id || null}, end_to_end_id)
    WHERE external_id = ${payload.external_id}
  `

  // Se o saque foi estornado, devolver o valor ao saldo
  if (payload.status === "refunded") {
    console.log(`🔄 Saque estornado! Devolvendo R$ ${payload.amount} ao saldo`)

    try {
      await sql`
        INSERT INTO wallets (user_id, balance)
        VALUES (${transaction.user_id}, ${payload.amount})
        ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + ${payload.amount}
      `

      console.log(`💰 Saldo do usuário ${transaction.user_id} atualizado (estorno): R$ ${payload.amount}`)

      // Verificar saldo após a atualização
      const walletAfter = await getUserWallet(transaction.user_id)
      console.log(`💰 Saldo depois: R$ ${walletAfter?.balance || 0}`)
    } catch (walletError) {
      console.error(`❌ Erro ao atualizar saldo no estorno:`, walletError)
      throw new Error(
        `Erro ao atualizar saldo: ${walletError instanceof Error ? walletError.message : "Erro desconhecido"}`,
      )
    }
  } else if (payload.status === "success") {
    console.log(`✅ Saque ${payload.external_id} confirmado: R$ ${payload.amount}`)
  } else if (payload.status === "pending") {
    console.log(`⏳ Saque ${payload.external_id} pendente: R$ ${payload.amount}`)
  } else {
    console.log(`❓ Status desconhecido para saque ${payload.external_id}: ${payload.status}`)
  }
}

// Endpoint para buscar logs dos webhooks
export async function GET() {
  try {
    const logs = await sql`
      SELECT * FROM webhook_logs
      ORDER BY created_at DESC
      LIMIT ${100}
    `
    // Converter o payload JSONB se for uma string
    const formattedLogs = logs.map((log) => ({
      ...log,
      payload: typeof log.payload === "string" ? JSON.parse(log.payload) : log.payload,
    }))

    return NextResponse.json({
      logs: formattedLogs,
      total: formattedLogs.length,
    })
  } catch (error) {
    console.error("Erro ao buscar logs:", error)
    return NextResponse.json({ error: "Erro ao buscar logs" }, { status: 500 })
  }
}
