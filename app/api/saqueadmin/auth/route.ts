import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    // Credenciais fixas para admin - apenas senha
    if (password === "4SS[9zd$r#yJ") {
      return NextResponse.json({
        success: true,
        message: "Login realizado com sucesso",
      })
    }

    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
  } catch (error) {
    console.error("Erro no login admin:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
