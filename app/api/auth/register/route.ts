import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"
import { getAffiliateByCode, createReferral } from "@/lib/affiliate-database"

const sql = neon(process.env.DATABASE_URL!)
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "horsepay-secret-key")

// Função para determinar tipo de usuário baseado no email
function getUserTypeFromEmail(email: string): string {
  const bloggerDomains = ["@blogger", "@influencer"]
  const isBlogger = bloggerDomains.some((domain) => email.includes(domain))
  return isBlogger ? "blogger" : "regular"
}

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Iniciando processo de registro...")

    // Parse do body da requisição
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("❌ Erro ao fazer parse do JSON:", error)
      return NextResponse.json({ success: false, error: "Dados inválidos enviados" }, { status: 400 })
    }

    const { name, username, phone, email, password, referral_code } = body

    console.log("📋 Dados recebidos:", { name, username, email, phone, referral_code })

    // Validações básicas
    if (!name || !username || !phone || !email || !password) {
      console.log("❌ Campos obrigatórios faltando")
      return NextResponse.json({ success: false, error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    if (password.length < 6) {
      console.log("❌ Senha muito curta")
      return NextResponse.json({ success: false, error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    // Verificar se email já existe
    try {
      console.log("🔍 Verificando se email já existe...")
      const existingUserByEmail = await sql`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `

      if (existingUserByEmail.length > 0) {
        console.log("❌ Email já existe")
        return NextResponse.json({ success: false, error: "Este email já está em uso" }, { status: 400 })
      }
    } catch (error) {
      console.error("❌ Erro ao verificar email:", error)
      return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
    }

    // Verificar se username já existe
    try {
      console.log("🔍 Verificando se username já existe...")
      const existingUserByUsername = await sql`
        SELECT id FROM users WHERE username = ${username} LIMIT 1
      `

      if (existingUserByUsername.length > 0) {
        console.log("❌ Username já existe")
        return NextResponse.json({ success: false, error: "Este nome de usuário já está em uso" }, { status: 400 })
      }
    } catch (error) {
      console.error("❌ Erro ao verificar username:", error)
      return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
    }

    // Determinar tipo de usuário
    const userType = getUserTypeFromEmail(email)
    console.log(`✅ Tipo de usuário determinado: ${userType} para email: ${email}`)

    // Hash da senha
    let passwordHash
    try {
      console.log("🔐 Gerando hash da senha...")
      passwordHash = await bcrypt.hash(password, 12)
    } catch (error) {
      console.error("❌ Erro ao gerar hash da senha:", error)
      return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
    }

    // Criar usuário
    let newUser
    try {
      console.log("👤 Criando usuário no banco...")
      const userResult = await sql`
        INSERT INTO users (email, name, username, phone, password_hash, user_type, created_at)
        VALUES (${email}, ${name}, ${username}, ${phone}, ${passwordHash}, ${userType}, NOW())
        RETURNING id, email, name, username, user_type, created_at
      `

      if (userResult.length === 0) {
        throw new Error("Falha ao criar usuário")
      }

      newUser = userResult[0]
      console.log("✅ Usuário criado:", newUser.id, "Tipo:", newUser.user_type)
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error)
      return NextResponse.json({ success: false, error: "Erro ao criar usuário" }, { status: 500 })
    }

    // Processar código de referência se fornecido
    if (referral_code) {
      try {
        console.log(`🔗 Processando código de referência: ${referral_code}`)
        const affiliate = await getAffiliateByCode(referral_code)
        if (affiliate && affiliate.status === "active") {
          // Atualizar usuário com código de referência
          await sql`
            UPDATE users 
            SET referred_by_code = ${referral_code}
            WHERE id = ${newUser.id}
          `

          // Criar referência
          await createReferral(affiliate.id, newUser.id)
          console.log(`✅ Referência criada para afiliado ${affiliate.id}`)
        } else {
          console.log(`⚠️ Código de referência inválido ou inativo: ${referral_code}`)
        }
      } catch (error) {
        console.error("❌ Erro ao processar referência:", error)
        // Não falhar o registro por causa da referência
      }
    }

    // Criar carteira do usuário
    try {
      console.log("💰 Criando carteira do usuário...")
      const initialBalance = 0.0 // Todas as contas começam com saldo zero

      await sql`
        INSERT INTO wallets (user_id, balance, created_at, updated_at)
        VALUES (${newUser.id}, ${initialBalance}, NOW(), NOW())
      `

      console.log(`✅ Carteira criada com saldo inicial: R$ ${initialBalance}`)
    } catch (error) {
      console.error("❌ Erro ao criar carteira:", error)
      // Não retornar erro aqui, pois o usuário já foi criado
      console.log("⚠️ Continuando sem carteira...")
    }

    // Criar JWT token
    let token
    try {
      console.log("🎫 Criando token JWT...")
      token = await new SignJWT({
        userId: newUser.id,
        email: newUser.email,
        userType: newUser.user_type || "regular",
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
      message: "Usuário criado com sucesso",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        user_type: newUser.user_type,
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

    console.log("🎉 Registro concluído com sucesso!")
    return response
  } catch (error) {
    console.error("❌ Erro geral no registro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
