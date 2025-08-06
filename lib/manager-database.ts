import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Manager {
  id: number
  user_id: number
  manager_code: string
  commission_rate: number
  total_agents: number
  total_commission_earned: number
  total_commission_paid: number
  status: string
  created_at: string
  updated_at: string
  user_name?: string
  user_email?: string
}

export interface ManagerCommission {
  id: number
  manager_id: number
  agent_id: number
  affiliate_id: number
  transaction_id: number
  commission_amount: number
  commission_rate: number
  status: string
  paid_at?: string
  created_at: string
}

export interface ManagerWithdrawal {
  id: number
  manager_id: number
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

// Criar gerente
export async function createManager(userId: number, commissionRate = 5.0): Promise<Manager> {
  const [manager] = await sql`
    INSERT INTO managers (user_id, manager_code, commission_rate)
    VALUES (${userId}, generate_manager_code(), ${commissionRate})
    RETURNING *
  `
  return manager
}

// Buscar gerente por user_id
export async function getManagerByUserId(userId: number): Promise<Manager | null> {
  const [manager] = await sql`
    SELECT * FROM managers WHERE user_id = ${userId}
  `
  return manager || null
}

// Buscar gerente por código
export async function getManagerByCode(code: string): Promise<Manager | null> {
  const [manager] = await sql`
    SELECT * FROM managers WHERE manager_code = ${code}
  `
  return manager || null
}

// Buscar gerente por ID
export async function getManagerById(id: number): Promise<Manager | null> {
  const [manager] = await sql`
    SELECT * FROM managers WHERE id = ${id}
  `
  return manager || null
}

// Buscar todos os gerentes (admin)
export async function getAllManagers(): Promise<Manager[]> {
  try {
    console.log("🔍 Buscando todos os gerentes...")

    const managers = await sql`
      SELECT 
        m.*,
        u.name as user_name,
        u.email as user_email
      FROM managers m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.total_commission_earned DESC
    `

    console.log("✅ Gerentes encontrados:", managers.length)
    return managers
  } catch (error) {
    console.error("❌ Erro ao buscar gerentes:", error)
    throw error
  }
}

// Atualizar taxa de comissão do gerente
export async function updateManagerCommissionRate(managerId: number, newRate: number): Promise<void> {
  await sql`
    UPDATE managers 
    SET commission_rate = ${newRate}
    WHERE id = ${managerId}
  `
}

// Atualizar status do gerente
export async function updateManagerStatus(managerId: number, status: string): Promise<void> {
  await sql`
    UPDATE managers 
    SET status = ${status}
    WHERE id = ${managerId}
  `
}

// Criar agente vinculado a gerente
export async function createAgentForManager(managerId: number, userId: number, commissionRate = 10.0): Promise<any> {
  const [agent] = await sql`
    INSERT INTO agents (user_id, manager_id, agent_code, commission_rate)
    VALUES (${userId}, ${managerId}, generate_agent_code(), ${commissionRate})
    RETURNING *
  `

  // Atualizar contador de agentes do gerente
  await sql`
    UPDATE managers 
    SET total_agents = total_agents + 1
    WHERE id = ${managerId}
  `

  return agent
}

// Buscar agentes do gerente
export async function getManagerAgents(managerId: number): Promise<any[]> {
  try {
    console.log(`🔍 Buscando agentes do gerente ${managerId}...`)

    const agents = await sql`
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email,
        (SELECT COUNT(*) FROM affiliates af WHERE af.agent_id = a.id) as total_affiliates,
        (SELECT COALESCE(SUM(ac.commission_amount), 0) FROM agent_commissions ac WHERE ac.agent_id = a.id) as total_commission_earned
      FROM agents a
      JOIN users u ON a.user_id = u.id
      WHERE a.manager_id = ${managerId}
      ORDER BY total_commission_earned DESC
    `

    console.log(`✅ Agentes encontrados: ${agents.length}`)
    return agents
  } catch (error) {
    console.error("❌ Erro ao buscar agentes do gerente:", error)
    throw error
  }
}

// Processar comissão do gerente
export async function processManagerCommission(
  managerId: number,
  agentId: number,
  affiliateId: number,
  transactionId: number,
  depositAmount: number,
): Promise<void> {
  const manager = await getManagerById(managerId)
  if (!manager) {
    console.log(`⚠️ Gerente ${managerId} não encontrado`)
    return
  }

  const commissionRate = manager.commission_rate || 5
  const commissionAmount = (depositAmount * commissionRate) / 100

  console.log(`💰 Calculando comissão do gerente: ${depositAmount} * ${commissionRate}% = ${commissionAmount}`)

  // Criar comissão do gerente
  await sql`
    INSERT INTO manager_commissions (manager_id, agent_id, affiliate_id, transaction_id, commission_amount, commission_rate)
    VALUES (${managerId}, ${agentId}, ${affiliateId}, ${transactionId}, ${commissionAmount}, ${commissionRate})
  `

  // Atualizar totais do gerente
  await sql`
    UPDATE managers 
    SET total_commission_earned = total_commission_earned + ${commissionAmount}
    WHERE id = ${managerId}
  `

  console.log(`✅ Comissão de gerente de R$ ${commissionAmount} processada para gerente ${managerId}`)
}

// Buscar comissões do gerente
export async function getManagerCommissions(managerId: number, limit = 50): Promise<ManagerCommission[]> {
  const commissions = await sql`
    SELECT * FROM manager_commissions 
    WHERE manager_id = ${managerId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return commissions
}

// Estatísticas do gerente - CORRIGIDA
export async function getManagerStats(managerId: number) {
  try {
    console.log(`🔍 Calculando estatísticas do gerente ${managerId}...`)

    // Contar agentes diretamente
    const [agentStats] = await sql`
      SELECT COUNT(*) as total_agents
      FROM agents 
      WHERE manager_id = ${managerId}
    `

    // Contar afiliados através dos agentes
    const [affiliateStats] = await sql`
      SELECT COUNT(af.id) as total_affiliates
      FROM affiliates af
      JOIN agents a ON af.agent_id = a.id
      WHERE a.manager_id = ${managerId}
    `

    // Contar referrals convertidos
    const [referralStats] = await sql`
      SELECT 
        COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as converted_referrals,
        COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as referrals_last_30_days,
        COALESCE(SUM(r.total_deposits), 0) as total_referred_deposits
      FROM referrals r
      JOIN affiliates af ON r.affiliate_id = af.id
      JOIN agents a ON af.agent_id = a.id
      WHERE a.manager_id = ${managerId}
    `

    // Calcular comissões do gerente
    const [commissionStats] = await sql`
      SELECT 
        COALESCE(SUM(mc.commission_amount), 0) as total_commission_earned,
        COALESCE(SUM(CASE WHEN mc.status = 'paid' THEN mc.commission_amount ELSE 0 END), 0) as total_commission_paid,
        COALESCE(SUM(CASE WHEN mc.status = 'pending' THEN mc.commission_amount ELSE 0 END), 0) as pending_commission
      FROM manager_commissions mc
      WHERE mc.manager_id = ${managerId}
    `

    // Calcular saques realizados
    const [withdrawalStats] = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_withdrawn
      FROM manager_withdrawals
      WHERE manager_id = ${managerId} AND status IN ('completed', 'processing')
    `

    const stats = {
      total_agents: Number(agentStats?.total_agents || 0),
      total_affiliates: Number(affiliateStats?.total_affiliates || 0),
      converted_referrals: Number(referralStats?.converted_referrals || 0),
      referrals_last_30_days: Number(referralStats?.referrals_last_30_days || 0),
      total_referred_deposits: Number(referralStats?.total_referred_deposits || 0),
      total_commission_earned: Number(commissionStats?.total_commission_earned || 0),
      total_commission_paid: Number(commissionStats?.total_commission_paid || 0),
      pending_commission: Number(commissionStats?.pending_commission || 0),
      total_withdrawn: Number(withdrawalStats?.total_withdrawn || 0),
    }

    console.log("✅ Estatísticas do gerente calculadas:", stats)
    return stats
  } catch (error) {
    console.error("❌ Erro ao calcular estatísticas do gerente:", error)
    return {
      total_agents: 0,
      total_affiliates: 0,
      converted_referrals: 0,
      referrals_last_30_days: 0,
      total_referred_deposits: 0,
      total_commission_earned: 0,
      total_commission_paid: 0,
      pending_commission: 0,
      total_withdrawn: 0,
    }
  }
}

// Solicitar saque de comissão do gerente
export async function createManagerWithdrawal(
  managerId: number,
  amount: number,
  pixKey: string,
  pixType: string,
): Promise<ManagerWithdrawal> {
  const [withdrawal] = await sql`
    INSERT INTO manager_withdrawals (manager_id, amount, pix_key, pix_type)
    VALUES (${managerId}, ${amount}, ${pixKey}, ${pixType})
    RETURNING *
  `
  return withdrawal
}

// Buscar saques do gerente
export async function getManagerWithdrawals(managerId: number): Promise<ManagerWithdrawal[]> {
  const withdrawals = await sql`
    SELECT * FROM manager_withdrawals 
    WHERE manager_id = ${managerId}
    ORDER BY created_at DESC
  `
  return withdrawals
}

// Buscar saques pendentes de gerentes (admin)
export async function getPendingManagerWithdrawals(): Promise<ManagerWithdrawal[]> {
  try {
    console.log("🔍 Buscando saques de gerentes pendentes...")

    const withdrawals = await sql`
      SELECT 
        mw.*,
        u.name as manager_name,
        u.email as manager_email,
        m.manager_code
      FROM manager_withdrawals mw
      JOIN managers m ON mw.manager_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE mw.status = 'pending'
      ORDER BY mw.created_at ASC
    `

    console.log("✅ Saques de gerentes pendentes encontrados:", withdrawals.length)
    return withdrawals
  } catch (error) {
    console.error("❌ Erro ao buscar saques de gerentes pendentes:", error)
    throw error
  }
}

// Atualizar status do saque do gerente
export async function updateManagerWithdrawalStatus(
  withdrawalId: number,
  status: string,
  notes?: string,
): Promise<void> {
  try {
    console.log(`🔄 Atualizando status do saque de gerente ${withdrawalId} para ${status}`)

    await sql`
      UPDATE manager_withdrawals 
      SET 
        status = ${status},
        notes = ${notes || null},
        updated_at = NOW()
      WHERE id = ${withdrawalId}
    `

    console.log("✅ Status do saque de gerente atualizado com sucesso")
  } catch (error) {
    console.error("❌ Erro ao atualizar status do saque de gerente:", error)
    throw error
  }
}

// Excluir gerente
export async function deleteManagerById(managerId: number): Promise<void> {
  try {
    console.log(`🗑️ Excluindo gerente ${managerId}...`)

    // Primeiro, excluir todas as comissões relacionadas
    await sql`
      DELETE FROM manager_commissions WHERE manager_id = ${managerId}
    `

    // Excluir todos os saques relacionados
    await sql`
      DELETE FROM manager_withdrawals WHERE manager_id = ${managerId}
    `

    // Remover a referência do gerente dos agentes (definir como NULL)
    await sql`
      UPDATE agents SET manager_id = NULL WHERE manager_id = ${managerId}
    `

    // Finalmente, excluir o gerente
    await sql`
      DELETE FROM managers WHERE id = ${managerId}
    `

    console.log(`✅ Gerente ${managerId} excluído com sucesso`)
  } catch (error) {
    console.error(`❌ Erro ao excluir gerente ${managerId}:`, error)
    throw error
  }
}

export { sql }
