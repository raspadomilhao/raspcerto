import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Affiliate {
  id: number
  user_id: number
  affiliate_code: string
  commission_rate: number
  total_referrals: number
  total_commission_earned: number
  total_commission_paid: number
  status: string
  created_at: string
  updated_at: string
}

export interface Referral {
  id: number
  affiliate_id: number
  referred_user_id: number
  conversion_date?: string
  first_deposit_amount: number
  total_deposits: number
  commission_earned: number
  status: string
  created_at: string
  updated_at: string
  user_name?: string
  user_email?: string
}

export interface Commission {
  id: number
  affiliate_id: number
  referral_id: number
  transaction_id: number
  commission_amount: number
  commission_rate: number
  status: string
  paid_at?: string
  created_at: string
}

export interface CommissionWithdrawal {
  id: number
  affiliate_id: number
  amount: number
  pix_key: string
  pix_type: string
  status: string
  processed_at?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Criar afiliado
export async function createAffiliate(userId: number, commissionRate = 50.0): Promise<Affiliate> {
  const [affiliate] = await sql`
    INSERT INTO affiliates (user_id, affiliate_code, commission_rate)
    VALUES (${userId}, generate_affiliate_code(), ${commissionRate})
    RETURNING *
  `
  return affiliate
}

// Buscar afiliado por user_id
export async function getAffiliateByUserId(userId: number): Promise<Affiliate | null> {
  const [affiliate] = await sql`
    SELECT * FROM affiliates WHERE user_id = ${userId}
  `
  return affiliate || null
}

// Buscar afiliado por código
export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  const [affiliate] = await sql`
    SELECT * FROM affiliates WHERE affiliate_code = ${code}
  `
  return affiliate || null
}

// Registrar referência
export async function createReferral(affiliateId: number, referredUserId: number): Promise<Referral> {
  const [referral] = await sql`
    INSERT INTO referrals (affiliate_id, referred_user_id)
    VALUES (${affiliateId}, ${referredUserId})
    ON CONFLICT (referred_user_id) DO NOTHING
    RETURNING *
  `

  if (referral) {
    // Atualizar contador de referências do afiliado
    await sql`
      UPDATE affiliates 
      SET total_referrals = total_referrals + 1
      WHERE id = ${affiliateId}
    `
  }

  return referral
}

// Modificar a função processReferralConversion para incluir comissão do agente
export async function processReferralConversion(
  referredUserId: number,
  depositAmount: number,
  transactionId: number,
): Promise<void> {
  // Buscar usuário para verificar código de referência
  const [user] = await sql`
    SELECT id, referred_by_code FROM users WHERE id = ${referredUserId}
  `

  if (!user || !user.referred_by_code) {
    console.log(`⚠️ Usuário ${referredUserId} não tem código de referência`)
    return
  }

  // Buscar afiliado pelo código
  const [affiliate] = await sql`
    SELECT * FROM affiliates WHERE affiliate_code = ${user.referred_by_code}
  `

  if (!affiliate) {
    console.log(`⚠️ Afiliado com código ${user.referred_by_code} não encontrado`)
    return
  }

  // Buscar referência
  const [referral] = await sql`
    SELECT * FROM referrals WHERE referred_user_id = ${referredUserId} AND affiliate_id = ${affiliate.id}
  `

  if (!referral) {
    console.log(`⚠️ Referência não encontrada para usuário ${referredUserId}`)
    // Criar referência se não existir
    await createReferral(affiliate.id, referredUserId)
    // Buscar novamente
    const [newReferral] = await sql`
      SELECT * FROM referrals WHERE referred_user_id = ${referredUserId} AND affiliate_id = ${affiliate.id}
    `
    if (!newReferral) {
      console.log(`❌ Não foi possível criar referência para usuário ${referredUserId}`)
      return
    }
  }

  const commissionRate = affiliate.commission_rate || 50
  const commissionAmount = (depositAmount * commissionRate) / 100

  console.log(`💰 Calculando comissão: ${depositAmount} * ${commissionRate}% = ${commissionAmount}`)

  // Atualizar referência
  await sql`
    UPDATE referrals 
    SET 
      conversion_date = NOW(),
      first_deposit_amount = ${depositAmount},
      total_deposits = total_deposits + ${depositAmount},
      commission_earned = commission_earned + ${commissionAmount},
      status = 'converted'
    WHERE referred_user_id = ${referredUserId} AND affiliate_id = ${affiliate.id}
  `

  // Criar comissão
  await sql`
    INSERT INTO commissions (affiliate_id, referral_id, transaction_id, commission_amount, commission_rate)
    VALUES (
      ${affiliate.id}, 
      (SELECT id FROM referrals WHERE referred_user_id = ${referredUserId} AND affiliate_id = ${affiliate.id}), 
      ${transactionId}, 
      ${commissionAmount}, 
      ${commissionRate}
    )
  `

  // Atualizar totais do afiliado
  await sql`
    UPDATE affiliates 
    SET total_commission_earned = total_commission_earned + ${commissionAmount}
    WHERE id = ${affiliate.id}
  `

  console.log(`✅ Comissão de R$ ${commissionAmount} processada para afiliado ${affiliate.id}`)

  // Processar comissão do agente se existir
  if (affiliate.agent_id) {
    const { processAgentCommission } = await import("@/lib/agent-database")
    await processAgentCommission(affiliate.agent_id, affiliate.id, transactionId, depositAmount)
  }
}

// Modificar a função processReferralDeposit para incluir comissão do agente
export async function processReferralDeposit(
  referredUserId: number,
  depositAmount: number,
  transactionId: number,
): Promise<void> {
  // Buscar usuário para verificar código de referência
  const [user] = await sql`
    SELECT id, referred_by_code FROM users WHERE id = ${referredUserId}
  `

  if (!user || !user.referred_by_code) {
    console.log(`⚠️ Usuário ${referredUserId} não tem código de referência`)
    return
  }

  // Buscar afiliado pelo código
  const [affiliate] = await sql`
    SELECT * FROM affiliates WHERE affiliate_code = ${user.referred_by_code}
  `

  if (!affiliate) {
    console.log(`⚠️ Afiliado com código ${user.referred_by_code} não encontrado`)
    return
  }

  // Buscar referência convertida
  const [referral] = await sql`
    SELECT * FROM referrals 
    WHERE referred_user_id = ${referredUserId} 
    AND affiliate_id = ${affiliate.id}
    AND status = 'converted'
  `

  if (!referral) {
    console.log(`⚠️ Referência convertida não encontrada para usuário ${referredUserId}`)
    return
  }

  const commissionRate = affiliate.commission_rate || 50
  const commissionAmount = (depositAmount * commissionRate) / 100

  console.log(`💰 Calculando comissão adicional: ${depositAmount} * ${commissionRate}% = ${commissionAmount}`)

  // Atualizar referência
  await sql`
    UPDATE referrals 
    SET 
      total_deposits = total_deposits + ${depositAmount},
      commission_earned = commission_earned + ${commissionAmount}
    WHERE id = ${referral.id}
  `

  // Criar comissão
  await sql`
    INSERT INTO commissions (affiliate_id, referral_id, transaction_id, commission_amount, commission_rate)
    VALUES (${affiliate.id}, ${referral.id}, ${transactionId}, ${commissionAmount}, ${commissionRate})
  `

  // Atualizar totais do afiliado
  await sql`
    UPDATE affiliates 
    SET total_commission_earned = total_commission_earned + ${commissionAmount}
    WHERE id = ${affiliate.id}
  `

  console.log(`✅ Comissão adicional de R$ ${commissionAmount} processada para afiliado ${affiliate.id}`)

  // Processar comissão do agente se existir
  if (affiliate.agent_id) {
    const { processAgentCommission } = await import("@/lib/agent-database")
    await processAgentCommission(affiliate.agent_id, affiliate.id, transactionId, depositAmount)
  }
}

// Buscar referências do afiliado
export async function getAffiliateReferrals(affiliateId: number, limit = 50): Promise<Referral[]> {
  const referrals = await sql`
    SELECT 
      r.*,
      u.name as user_name,
      u.email as user_email
    FROM referrals r
    JOIN users u ON r.referred_user_id = u.id
    WHERE r.affiliate_id = ${affiliateId}
    ORDER BY r.created_at DESC
    LIMIT ${limit}
  `
  return referrals
}

// Buscar comissões do afiliado
export async function getAffiliateCommissions(affiliateId: number, limit = 50): Promise<Commission[]> {
  const commissions = await sql`
    SELECT * FROM commissions 
    WHERE affiliate_id = ${affiliateId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return commissions
}

// CORREÇÃO: Estatísticas do afiliado usando dados diretos da tabela affiliates
export async function getAffiliateStats(affiliateId: number) {
  try {
    // Buscar dados diretos da tabela affiliates
    const [affiliate] = await sql`
      SELECT 
        total_commission_earned,
        total_commission_paid,
        total_referrals
      FROM affiliates 
      WHERE id = ${affiliateId}
    `

    if (!affiliate) {
      return {
        total_referrals: 0,
        converted_referrals: 0,
        referrals_last_30_days: 0,
        total_referred_deposits: 0,
        total_commission_earned: 0,
        total_commission_paid: 0,
        pending_commission: 0,
      }
    }

    // Buscar estatísticas adicionais das referências
    const [referralStats] = await sql`
      SELECT 
        COUNT(r.id) as total_referrals,
        COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as converted_referrals,
        COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as referrals_last_30_days,
        COALESCE(SUM(r.total_deposits), 0) as total_referred_deposits
      FROM referrals r
      WHERE r.affiliate_id = ${affiliateId}
    `

    // Buscar saques pendentes
    const [pendingWithdrawals] = await sql`
      SELECT COALESCE(SUM(amount), 0) as pending_amount
      FROM commission_withdrawals 
      WHERE affiliate_id = ${affiliateId} AND status = 'pending'
    `

    return {
      total_referrals: Number(referralStats?.total_referrals || 0),
      converted_referrals: Number(referralStats?.converted_referrals || 0),
      referrals_last_30_days: Number(referralStats?.referrals_last_30_days || 0),
      total_referred_deposits: Number(referralStats?.total_referred_deposits || 0),
      total_commission_earned: Number(affiliate.total_commission_earned || 0),
      total_commission_paid: Number(affiliate.total_commission_paid || 0),
      pending_commission: Number(pendingWithdrawals?.pending_amount || 0),
    }
  } catch (error) {
    console.error("Erro ao buscar estatísticas do afiliado:", error)
    return {
      total_referrals: 0,
      converted_referrals: 0,
      referrals_last_30_days: 0,
      total_referred_deposits: 0,
      total_commission_earned: 0,
      total_commission_paid: 0,
      pending_commission: 0,
    }
  }
}

// Solicitar saque de comissão
export async function createCommissionWithdrawal(
  affiliateId: number,
  amount: number,
  pixKey: string,
  pixType: string,
): Promise<CommissionWithdrawal> {
  const [withdrawal] = await sql`
    INSERT INTO commission_withdrawals (affiliate_id, amount, pix_key, pix_type)
    VALUES (${affiliateId}, ${amount}, ${pixKey}, ${pixType})
    RETURNING *
  `
  return withdrawal
}

// Buscar saques de comissão do afiliado
export async function getAffiliateWithdrawals(affiliateId: number): Promise<CommissionWithdrawal[]> {
  const withdrawals = await sql`
    SELECT * FROM commission_withdrawals 
    WHERE affiliate_id = ${affiliateId}
    ORDER BY created_at DESC
  `
  return withdrawals
}

// Atualizar taxa de comissão do afiliado
export async function updateAffiliateCommissionRate(affiliateId: number, newRate: number): Promise<void> {
  await sql`
    UPDATE affiliates 
    SET commission_rate = ${newRate}
    WHERE id = ${affiliateId}
  `
}

// CORREÇÃO: Atualizar status do saque de comissão com controle de saldo
export async function updateCommissionWithdrawalStatus(
  withdrawalId: number,
  status: string,
  notes?: string,
): Promise<void> {
  try {
    console.log(`🔄 Atualizando status do saque ${withdrawalId} para ${status}`)

    // Buscar dados do saque atual
    const [withdrawal] = await sql`
      SELECT * FROM commission_withdrawals WHERE id = ${withdrawalId}
    `

    if (!withdrawal) {
      throw new Error(`Saque ${withdrawalId} não encontrado`)
    }

    const previousStatus = withdrawal.status

    // Atualizar status do saque
    await sql`
      UPDATE commission_withdrawals 
      SET 
        status = ${status},
        notes = ${notes || null},
        updated_at = NOW(),
        processed_at = CASE WHEN ${status} = 'processing' THEN NOW() ELSE processed_at END,
        completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END
      WHERE id = ${withdrawalId}
    `

    // Gerenciar saldo baseado na mudança de status
    if (status === "cancelled" && previousStatus === "pending") {
      // Saque cancelado - estornar valor (valor já foi debitado na solicitação)
      await sql`
        UPDATE affiliates 
        SET total_commission_paid = total_commission_paid - ${withdrawal.amount}
        WHERE id = ${withdrawal.affiliate_id}
      `
      console.log(`🔄 Valor R$ ${withdrawal.amount} estornado para o afiliado ${withdrawal.affiliate_id}`)
    }
    // Se status mudou para 'completed', não fazer nada pois valor já foi debitado na solicitação

    console.log("✅ Status do saque atualizado com sucesso")
  } catch (error) {
    console.error("❌ Erro ao atualizar status do saque:", error)
    throw error
  }
}

// Buscar todos os afiliados (admin)
export async function getAllAffiliates(): Promise<Affiliate[]> {
  try {
    console.log("🔍 Buscando todos os afiliados...")

    const affiliates = await sql`
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.total_commission_earned DESC
    `

    console.log("✅ Afiliados encontrados:", affiliates.length)
    return affiliates
  } catch (error) {
    console.error("❌ Erro ao buscar afiliados:", error)
    throw error
  }
}

// Buscar saques pendentes (admin)
export async function getPendingCommissionWithdrawals(): Promise<CommissionWithdrawal[]> {
  try {
    console.log("🔍 Buscando saques pendentes...")

    const withdrawals = await sql`
      SELECT 
        cw.*,
        u.name as affiliate_name,
        u.email as affiliate_email,
        a.affiliate_code
      FROM commission_withdrawals cw
      JOIN affiliates a ON cw.affiliate_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE cw.status = 'pending'
      ORDER BY cw.created_at ASC
    `

    console.log("✅ Saques pendentes encontrados:", withdrawals.length)
    return withdrawals
  } catch (error) {
    console.error("❌ Erro ao buscar saques pendentes:", error)
    throw error
  }
}

// Atualizar status do afiliado
export async function updateAffiliateStatus(affiliateId: number, status: string): Promise<void> {
  await sql`
    UPDATE affiliates 
    SET status = ${status}
    WHERE id = ${affiliateId}
  `
}

// Excluir afiliado
export async function deleteAffiliateById(affiliateId: number): Promise<void> {
  try {
    console.log(`🗑️ Excluindo afiliado ${affiliateId}...`)

    // Primeiro, excluir todas as comissões relacionadas
    await sql`
      DELETE FROM commissions WHERE affiliate_id = ${affiliateId}
    `

    // Excluir todas as comissões de agente relacionadas
    await sql`
      DELETE FROM agent_commissions WHERE affiliate_id = ${affiliateId}
    `

    // Excluir todos os saques relacionados
    await sql`
      DELETE FROM commission_withdrawals WHERE affiliate_id = ${affiliateId}
    `

    // Excluir todas as referências relacionadas
    await sql`
      DELETE FROM referrals WHERE affiliate_id = ${affiliateId}
    `

    // Remover código de referência dos usuários que foram indicados por este afiliado
    await sql`
      UPDATE users 
      SET referred_by_code = NULL 
      WHERE referred_by_code = (
        SELECT affiliate_code FROM affiliates WHERE id = ${affiliateId}
      )
    `

    // Finalmente, excluir o afiliado
    await sql`
      DELETE FROM affiliates WHERE id = ${affiliateId}
    `

    console.log(`✅ Afiliado ${affiliateId} excluído com sucesso`)
  } catch (error) {
    console.error(`❌ Erro ao excluir afiliado ${affiliateId}:`, error)
    throw error
  }
}

export { sql }
