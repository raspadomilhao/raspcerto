import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "horsepay-secret-key")

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Iniciando processo de login...")

    // Parse do body da requisição
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("❌ Erro ao fazer parse do JSON:", error)
      return NextResponse.json({ success: false, error: "Dados inválidos enviados" }, { status: 400 })
    }

    const { login, password } = body

    console.log("📋 Tentativa de login para:", login)

    // Validações básicas
    if (!login || !password) {
      console.log("❌ Login ou senha faltando")
      return NextResponse.json({ success: false, error: "Email/usuário e senha são obrigatórios" }, { status: 400 })
    }

    // Buscar usuário por email ou username
    let user
    try {
      console.log("🔍 Buscando usuário no banco...")
      const userResult = await sql`
        SELECT id, email, name, username, password_hash, user_type, created_at
        FROM users 
        WHERE LOWER(email) = LOWER(${login}) OR LOWER(username) = LOWER(${login})
        LIMIT 1
      `

      if (userResult.length === 0) {
        console.log("❌ Usuário não encontrado")
        return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 })
      }

      user = userResult[0]
      console.log("✅ Usuário encontrado:", user.id, user.email)
    } catch (error) {
      console.error("❌ Erro ao buscar usuário:", error)
      return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
    }

    // Verificar senha
    try {
      console.log("🔐 Verificando senha...")
      const passwordMatch = await bcrypt.compare(password, user.password_hash)

      if (!passwordMatch) {
        console.log("❌ Senha incorreta")
        return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 })
      }

      console.log("✅ Senha correta")
    } catch (error) {
      console.error("❌ Erro ao verificar senha:", error)
      return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
    }

    // Buscar carteira do usuário
    let wallet
    try {
      console.log("💰 Buscando carteira do usuário...")
      const walletResult = await sql`
        SELECT balance FROM wallets WHERE user_id = ${user.id} LIMIT 1
      `

      if (walletResult.length > 0) {
        wallet = walletResult[0]
        console.log("✅ Carteira encontrada, saldo:", wallet.balance)
      } else {
        console.log("⚠️ Carteira não encontrada, criando...")
        const initialBalance = user.user_type === "blogger" ? 999999.99 : 0.0

        await sql`
          INSERT INTO wallets (user_id, balance, created_at, updated_at)
          VALUES (${user.id}, ${initialBalance}, NOW(), NOW())
        `

        wallet = { balance: initialBalance }
        console.log("✅ Carteira criada com saldo:", initialBalance)
      }
    } catch (error) {
      console.error("❌ Erro ao buscar/criar carteira:", error)
      wallet = { balance: 0.0 }
    }

    // Criar JWT token
    let token
    try {
      console.log("🎫 Criando token JWT...")
      token = await new SignJWT({
        userId: user.id,
        email: user.email,
        userType: user.user_type || "regular",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .setIssuedAt()
        .sign(secret)

      console.log("✅ Token criado com sucesso")
    } catch (error) {
      console.error("❌ Erro ao criar token:", error)
      return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
    }

    // Preparar resposta
    const response = NextResponse.json({
      success: true,
      message: "Login realizado com sucesso",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        user_type: user.user_type,
        balance: wallet.balance,
      },
      token,
    })

    // Definir cookie com o token
    try {
      response.cookies.set("auth-token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400, // 24 horas
        path: "/",
      })
      console.log("✅ Cookie definido com sucesso")
    } catch (error) {
      console.error("❌ Erro ao definir cookie:", error)
      // Não retornar erro, pois o token ainda está na resposta
    }

    console.log("🎉 Login concluído com sucesso!")
    return response
  } catch (error) {
    console.error("❌ Erro geral no login:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
