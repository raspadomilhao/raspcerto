import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface User {
  id: number
  email: string
  name: string
  username?: string
  phone?: string
  password_hash?: string
  client_key?: string
  client_secret?: string
  user_type?: string
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: number
  user_id: number
  balance: string | number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  user_id: number
  type: "deposit" | "withdraw" | "game_play" | "game_prize"
  amount: string | number
  status: string
  external_id?: number
  end_to_end_id?: string
  payer_name?: string
  pix_key?: string
  pix_type?: string
  callback_url?: string
  qr_code?: string
  copy_paste_code?: string
  is_demo?: boolean
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: number
  type: string
  external_id?: number
  payload: any
  processed: boolean
  error_message?: string
  created_at: string
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

export async function createUser(
  email: string,
  name: string,
  username?: string,
  phone?: string,
  passwordHash?: string,
  userType = "regular",
): Promise<User> {
  const emailLower = email.toLowerCase()
  const usernameLower = username?.toLowerCase()

  const [user] = await sql`
    INSERT INTO users (email, name, username, phone, password_hash, user_type)
    VALUES (${emailLower}, ${name}, ${usernameLower || null}, ${phone || null}, ${passwordHash || null}, ${userType})
    RETURNING *
  `

  // Criar carteira com saldo inicial - todas as contas começam com R$ 0,00
  const initialBalance = 0.0
  await sql`
    INSERT INTO wallets (user_id, balance)
    VALUES (${user.id}, ${initialBalance})
    ON CONFLICT (user_id) DO NOTHING;
  `

  return user
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await sql`
    SELECT * FROM users WHERE LOWER(email) = LOWER(${email})
  `
  return user || null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const [user] = await sql`
    SELECT * FROM users WHERE LOWER(username) = LOWER(${username})
  `
  return user || null
}

export async function getUserById(id: number): Promise<User | null> {
  const [user] = await sql`
    SELECT * FROM users WHERE id = ${id}
  `
  return user || null
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const [user] = await sql`
    UPDATE users 
    SET name = COALESCE(${data.name}, name),
        username = COALESCE(${data.username}, username),
        phone = COALESCE(${data.phone}, phone),
        client_key = COALESCE(${data.client_key}, client_key),
        client_secret = COALESCE(${data.client_secret}, client_secret),
        user_type = COALESCE(${data.user_type}, user_type)
    WHERE id = ${id}
    RETURNING *
  `
  return user
}

// Nova função para atualizar a senha do usuário
export async function updateUserPasswordHash(userId: number, passwordHash: string): Promise<User> {
  const [user] = await sql`
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id = ${userId}
    RETURNING *
  `
  if (!user) {
    throw new Error(`Usuário com ID ${userId} não encontrado.`)
  }
  return user
}

export async function getUserWallet(userId: number): Promise<Wallet | null> {
  const [wallet] = await sql`
    SELECT * FROM wallets WHERE user_id = ${userId}
  `
  return wallet || null
}

export async function updateWalletBalance(
  userId: number,
  amount: number,
  operation: "add" | "subtract",
  userType = "regular",
): Promise<Wallet> {
  console.log(
    `💰 updateWalletBalance: userId=${userId}, amount=${amount}, operation=${operation}, userType=${userType}`,
  )

  const operator = operation === "add" ? "+" : "-"
  const absoluteAmount = Math.abs(amount)

  try {
    const [wallet] = await sql`
      INSERT INTO wallets (user_id, balance)
      VALUES (${userId}, ${operation === "add" ? absoluteAmount : -absoluteAmount})
      ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance ${sql.unsafe(operator)} ${absoluteAmount}
      RETURNING *
    `

    if (!wallet) {
      throw new Error(`Falha crítica ao operar na carteira do usuário ${userId}`)
    }

    console.log(`💰 Carteira atualizada com sucesso`)
    return wallet
  } catch (error) {
    console.error(`❌ Erro ao executar updateWalletBalance para userId ${userId}:`, error)
    throw error
  }
}

export async function createTransaction(
  data: Omit<Transaction, "id" | "created_at" | "updated_at">,
): Promise<Transaction> {
  const [transaction] = await sql`
    INSERT INTO transactions (
      user_id, type, amount, status, external_id, end_to_end_id, 
      payer_name, pix_key, pix_type, callback_url, qr_code, copy_paste_code, is_demo
    )
    VALUES (
      ${data.user_id}, ${data.type}, ${data.amount}, ${data.status}, 
      ${data.external_id}, ${data.end_to_end_id}, ${data.payer_name}, 
      ${data.pix_key}, ${data.pix_type}, ${data.callback_url}, 
      ${data.qr_code}, ${data.copy_paste_code}, ${data.is_demo || false}
    )
    RETURNING *
  `
  return transaction
}

export async function getTransactionByExternalId(externalId: number): Promise<Transaction | null> {
  const [transaction] = await sql`
    SELECT * FROM transactions WHERE external_id = ${externalId}
  `
  return transaction || null
}

export async function getUserTransactions(userId: number, limit = 50): Promise<Transaction[]> {
  const transactions = await sql`
    SELECT * FROM transactions 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return transactions
}

export async function updateTransactionStatus(
  externalId: number,
  status: string,
  endToEndId?: string,
): Promise<Transaction | null> {
  const [transaction] = await sql`
    UPDATE transactions 
    SET status = ${status}, end_to_end_id = COALESCE(${endToEndId || null}, end_to_end_id)
    WHERE external_id = ${externalId}
    RETURNING *
  `
  return transaction || null
}

export async function createWebhookLog(data: Omit<WebhookLog, "id" | "created_at">): Promise<WebhookLog> {
  const [log] = await sql`
    INSERT INTO webhook_logs (type, external_id, payload, processed, error_message)
    VALUES (${data.type}, ${data.external_id}, ${JSON.stringify(data.payload)}, ${data.processed}, ${data.error_message})
    RETURNING *
  `
  return log
}

export async function getWebhookLogs(limit = 100): Promise<WebhookLog[]> {
  const logs = await sql`
    SELECT * FROM webhook_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return logs.map((log) => ({
    ...log,
    payload: typeof log.payload === "string" ? JSON.parse(log.payload) : log.payload,
  }))
}

export async function getUserStats(userId: number) {
  const [stats] = await sql`
    SELECT 
      COUNT(CASE WHEN type = 'deposit' AND status = 'success' THEN 1 END) as successful_deposits,
      COUNT(CASE WHEN type = 'withdraw' AND status = 'success' THEN 1 END) as successful_withdraws,
      COUNT(CASE WHEN type = 'game_play' THEN 1 END) as games_played,
      COUNT(CASE WHEN type = 'game_prize' THEN 1 END) as prizes_won,
      COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'success' THEN amount ELSE 0 END), 0) as total_deposited,
      COALESCE(SUM(CASE WHEN type = 'withdraw' AND status = 'success' THEN amount ELSE 0 END), 0) as total_withdrawn,
      COALESCE(SUM(CASE WHEN type = 'game_play' THEN amount ELSE 0 END), 0) as total_spent_on_games,
      COALESCE(SUM(CASE WHEN type = 'game_prize' THEN amount ELSE 0 END), 0) as total_prizes_won,
      COUNT(*) as total_transactions
    FROM transactions
    WHERE user_id = ${userId}
  `
  return (
    stats || {
      successful_deposits: "0",
      successful_withdraws: "0",
      games_played: "0",
      prizes_won: "0",
      total_deposited: "0",
      total_withdrawn: "0",
      total_spent_on_games: "0",
      total_prizes_won: "0",
      total_transactions: "0",
    }
  )
}

export async function getAdminStats() {
  const [stats] = await sql`
  SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL '24 hours' THEN u.id END) as active_users_24h,
    COUNT(CASE WHEN t.type = 'deposit' AND t.status = 'success' AND t.external_id IS NOT NULL THEN 1 END) as total_deposits,
    COUNT(CASE WHEN t.type = 'withdraw' AND t.status = 'success' AND t.external_id IS NOT NULL THEN 1 END) as total_withdraws,
    COUNT(CASE WHEN t.type = 'game_play' THEN 1 END) as total_games_played,
    COUNT(CASE WHEN t.type = 'game_prize' THEN 1 END) as total_prizes_awarded,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'success' AND t.external_id IS NOT NULL THEN t.amount ELSE 0 END), 0) as total_deposited,
    COALESCE(SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'success' AND t.external_id IS NOT NULL THEN t.amount ELSE 0 END), 0) as total_withdrawn,
    COALESCE(SUM(CASE WHEN t.type = 'game_play' THEN t.amount ELSE 0 END), 0) as total_game_revenue,
    COALESCE(SUM(CASE WHEN t.type = 'game_prize' THEN t.amount ELSE 0 END), 0) as total_prizes_paid,
    COALESCE(SUM(w.balance), 0) as total_balance_in_wallets
  FROM users u
  LEFT JOIN transactions t ON u.id = t.user_id
  LEFT JOIN wallets w ON u.id = w.user_id
`

  const recentTransactions = await sql`
    SELECT 
      t.*,
      u.name as user_name,
      u.username as user_username,
      u.user_type
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
    LIMIT 10
  `

  return {
    ...stats,
    recent_transactions: recentTransactions,
  }
}

export async function getAllUsersWithBalance() {
  const users = await sql`
    SELECT 
      u.id,
      u.name,
      u.username,
      u.email,
      u.user_type,
      u.created_at,
      COALESCE(w.balance, 0) as balance,
      COUNT(t.id) as total_transactions
    FROM users u
    LEFT JOIN wallets w ON u.id = w.user_id
    LEFT JOIN transactions t ON u.id = t.user_id
    GROUP BY u.id, u.name, u.username, u.email, u.user_type, u.created_at, w.balance
    ORDER BY u.created_at DESC
  `
  return users
}

export { sql }
