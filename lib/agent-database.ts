import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Agent {
  id: number
  user_id: number
  agent_code: string
  commission_rate: number
  total_affiliates: number
  total_commission_earned: number
  total_commission_paid: number
  status: string
  created_at: string
  updated_at: string
  user_name?: string
  user_email?: string
}

export interface AgentCommission {
  id: number
  agent_id: number
  affiliate_id: number
  transaction_id: number
  commission_amount: number
  commission_rate: number
  status: string
  paid_at?: string
  created_at: string
}

export interface AgentWithdrawal {
  id: number
  agent_id: number
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

// Criar agente
export async function createAgent(userId: number, commissionRate = 10.0): Promise<Agent> {
  const [agent] = await sql`
    INSERT INTO agents (user_id, agent_code, commission_rate)
    VALUES (${userId}, generate_agent_code(), ${commissionRate})
    RETURNING *
  `
  return agent
}

// Buscar agente por user_id
export async function getAgentByUserId(userId: number): Promise<Agent | null> {
  const [agent] = await sql`
    SELECT * FROM agents WHERE user_id = ${userId}
  `
  return agent || null
}

// Buscar agente por código
export async function getAgentByCode(code: string): Promise<Agent | null> {
  const [agent] = await sql`
    SELECT * FROM agents WHERE agent_code = ${code}
  `
  return agent || null
}

// Buscar agente por ID
export async function getAgentById(id: number): Promise<Agent | null> {
  const [agent] = await sql`
    SELECT * FROM agents WHERE id = ${id}
  `
  return agent || null
}

// Buscar todos os agentes (admin)
export async function getAllAgents(): Promise<Agent[]> {
  try {
    console.log("🔍 Buscando todos os agentes...")

    const agents = await sql`
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email
      FROM agents a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.total_commission_earned DESC
    `

    console.log("✅ Agentes encontrados:", agents.length)
    return agents
  } catch (error) {
    console.error("❌ Erro ao buscar agentes:", error)
    throw error
  }
}

// Atualizar taxa de comissão do agente
export async function updateAgentCommissionRate(agentId: number, newRate: number): Promise<void> {
  await sql`
    UPDATE agents 
    SET commission_rate = ${newRate}
    WHERE id = ${agentId}
  `
}

// Atualizar status do agente
export async function updateAgentStatus(agentId: number, status: string): Promise<void> {
  await sql`
    UPDATE agents 
    SET status = ${status}
    WHERE id = ${agentId}
  `
}

// Criar afiliado vinculado a agente
export async function createAffiliateForAgent(agentId: number, userId: number, commissionRate = 50.0): Promise<any> {
  const [affiliate] = await sql`
    INSERT INTO affiliates (user_id, agent_id, affiliate_code, commission_rate)
    VALUES (${userId}, ${agentId}, generate_affiliate_code(), ${commissionRate})
    RETURNING *
  `

  // Atualizar contador de afiliados do agente
  await sql`
    UPDATE agents 
    SET total_affiliates = total_affiliates + 1
    WHERE id = ${agentId}
  `

  return affiliate
}

// Buscar afiliados do agente
export async function getAgentAffiliates(agentId: number): Promise<any[]> {
  try {
    const affiliates = await sql`
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email,
        COALESCE(a.total_referrals, 0) as total_referrals,
        COALESCE(a.total_commission_earned, 0) as total_commission_earned
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      WHERE a.agent_id = ${agentId}
      ORDER BY a.total_commission_earned DESC
    `

    return affiliates.map((affiliate) => ({
      ...affiliate,
      total_referrals: Number(affiliate.total_referrals || 0),
      total_commission_earned: Number(affiliate.total_commission_earned || 0),
    }))
  } catch (error) {
    console.error("❌ Erro ao buscar afiliados do agente:", error)
    return []
  }
}

// Processar comissão do agente
export async function processAgentCommission(
  agentId: number,
  affiliateId: number,
  transactionId: number,
  depositAmount: number,
): Promise<void> {
  const agent = await getAgentById(agentId)
  if (!agent) {
    console.log(`⚠️ Agente ${agentId} não encontrado`)
    return
  }

  const commissionRate = agent.commission_rate || 10
  const commissionAmount = (depositAmount * commissionRate) / 100

  console.log(`💰 Calculando comissão do agente: ${depositAmount} * ${commissionRate}% = ${commissionAmount}`)

  // Criar comissão do agente
  await sql`
    INSERT INTO agent_commissions (agent_id, affiliate_id, transaction_id, commission_amount, commission_rate)
    VALUES (${agentId}, ${affiliateId}, ${transactionId}, ${commissionAmount}, ${commissionRate})
  `

  // Atualizar totais do agente
  await sql`
    UPDATE agents 
    SET total_commission_earned = total_commission_earned + ${commissionAmount}
    WHERE id = ${agentId}
  `

  console.log(`✅ Comissão de agente de R$ ${commissionAmount} processada para agente ${agentId}`)
}

// Buscar comissões do agente
export async function getAgentCommissions(agentId: number, limit = 50): Promise<AgentCommission[]> {
  const commissions = await sql`
    SELECT * FROM agent_commissions 
    WHERE agent_id = ${agentId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return commissions
}

// Estatísticas do agente
export async function getAgentStats(agentId: number) {
  try {
    // Buscar estatísticas básicas dos afiliados
    const [affiliateStats] = await sql`
      SELECT 
        COUNT(*) as total_affiliates,
        COUNT(CASE WHEN af.status = 'active' THEN 1 END) as active_affiliates
      FROM affiliates af
      WHERE af.agent_id = ${agentId}
    `

    // Buscar estatísticas de referrals dos afiliados do agente
    const [referralStats] = await sql`
      SELECT 
        COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as converted_referrals,
        COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as referrals_last_30_days,
        COALESCE(SUM(r.total_deposits), 0) as total_referred_deposits
      FROM affiliates af
      LEFT JOIN referrals r ON af.id = r.affiliate_id
      WHERE af.agent_id = ${agentId}
    `

    // Buscar estatísticas de comissões do agente
    const [commissionStats] = await sql`
      SELECT 
        COALESCE(SUM(commission_amount), 0) as total_commission_earned,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as total_commission_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_commission
      FROM agent_commissions
      WHERE agent_id = ${agentId}
    `

    return {
      total_affiliates: Number(affiliateStats?.total_affiliates || 0),
      active_affiliates: Number(affiliateStats?.active_affiliates || 0),
      converted_referrals: Number(referralStats?.converted_referrals || 0),
      referrals_last_30_days: Number(referralStats?.referrals_last_30_days || 0),
      total_referred_deposits: Number(referralStats?.total_referred_deposits || 0),
      total_commission_earned: Number(commissionStats?.total_commission_earned || 0),
      total_commission_paid: Number(commissionStats?.total_commission_paid || 0),
      pending_commission: Number(commissionStats?.pending_commission || 0),
    }
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas do agente:", error)
    return {
      total_affiliates: 0,
      active_affiliates: 0,
      converted_referrals: 0,
      referrals_last_30_days: 0,
      total_referred_deposits: 0,
      total_commission_earned: 0,
      total_commission_paid: 0,
      pending_commission: 0,
    }
  }
}

// Solicitar saque de comissão do agente
export async function createAgentWithdrawal(
  agentId: number,
  amount: number,
  pixKey: string,
  pixType: string,
): Promise<AgentWithdrawal> {
  const [withdrawal] = await sql`
    INSERT INTO agent_withdrawals (agent_id, amount, pix_key, pix_type)
    VALUES (${agentId}, ${amount}, ${pixKey}, ${pixType})
    RETURNING *
  `
  return withdrawal
}

// Buscar saques do agente
export async function getAgentWithdrawals(agentId: number): Promise<AgentWithdrawal[]> {
  const withdrawals = await sql`
    SELECT * FROM agent_withdrawals 
    WHERE agent_id = ${agentId}
    ORDER BY created_at DESC
  `
  return withdrawals
}

// Buscar saques pendentes de agentes (admin)
export async function getPendingAgentWithdrawals(): Promise<AgentWithdrawal[]> {
  try {
    console.log("🔍 Buscando saques de agentes pendentes...")

    const withdrawals = await sql`
      SELECT 
        aw.*,
        u.name as agent_name,
        u.email as agent_email,
        a.agent_code
      FROM agent_withdrawals aw
      JOIN agents a ON aw.agent_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE aw.status = 'pending'
      ORDER BY aw.created_at ASC
    `

    console.log("✅ Saques de agentes pendentes encontrados:", withdrawals.length)
    return withdrawals
  } catch (error) {
    console.error("❌ Erro ao buscar saques de agentes pendentes:", error)
    throw error
  }
}

// Atualizar status do saque do agente
export async function updateAgentWithdrawalStatus(withdrawalId: number, status: string, notes?: string): Promise<void> {
  try {
    console.log(`🔄 Atualizando status do saque de agente ${withdrawalId} para ${status}`)

    await sql`
      UPDATE agent_withdrawals 
      SET 
        status = ${status},
        notes = ${notes || null},
        updated_at = NOW()
      WHERE id = ${withdrawalId}
    `

    console.log("✅ Status do saque de agente atualizado com sucesso")
  } catch (error) {
    console.error("❌ Erro ao atualizar status do saque de agente:", error)
    throw error
  }
}

// Excluir agente
export async function deleteAgentById(agentId: number): Promise<void> {
  try {
    console.log(`🗑️ Excluindo agente ${agentId}...`)

    // Primeiro, excluir todas as comissões relacionadas
    await sql`
      DELETE FROM agent_commissions WHERE agent_id = ${agentId}
    `

    // Excluir todos os saques relacionados
    await sql`
      DELETE FROM agent_withdrawals WHERE agent_id = ${agentId}
    `

    // Remover a referência do agente dos afiliados (definir como NULL)
    await sql`
      UPDATE affiliates SET agent_id = NULL WHERE agent_id = ${agentId}
    `

    // Finalmente, excluir o agente
    await sql`
      DELETE FROM agents WHERE id = ${agentId}
    `

    console.log(`✅ Agente ${agentId} excluído com sucesso`)
  } catch (error) {
    console.error(`❌ Erro ao excluir agente ${agentId}:`, error)
    throw error
  }
}

export { sql }
