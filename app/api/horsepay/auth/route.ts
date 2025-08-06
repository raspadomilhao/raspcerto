import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Sistema de rodízio: 40% primário, 60% secundário
    const usePrimary = Math.random() < 0.75

    let clientKey: string
    let clientSecret: string

    if (usePrimary) {
      // Credenciais primárias (40% das vezes)
      clientKey = process.env.HORSEPAY_CLIENT_KEY || ""
      clientSecret = process.env.HORSEPAY_CLIENT_SECRET || ""
      console.log("Using PRIMARY HorsePay credentials")
    } else {
      // Credenciais secundárias (60% das vezes)
      clientKey = process.env.HORSEPAY_CLIENT_KEY_SECONDARY || ""
      clientSecret = process.env.HORSEPAY_CLIENT_SECRET_SECONDARY || ""
      console.log("Using SECONDARY HorsePay credentials")
    }

    // Log environment variables for debugging (remove in production)
    console.log("HorsePay Auth - Primary Client Key exists:", !!process.env.HORSEPAY_CLIENT_KEY)
    console.log("HorsePay Auth - Primary Client Secret exists:", !!process.env.HORSEPAY_CLIENT_SECRET)
    console.log("HorsePay Auth - Secondary Client Key exists:", !!process.env.HORSEPAY_CLIENT_KEY_SECONDARY)
    console.log("HorsePay Auth - Secondary Client Secret exists:", !!process.env.HORSEPAY_CLIENT_SECRET_SECONDARY)

    const requestBody = {
      client_key: clientKey,
      client_secret: clientSecret,
    }

    // Validate that we have the required credentials
    if (!requestBody.client_key || !requestBody.client_secret) {
      console.error("Missing HorsePay credentials for selected set")
      return NextResponse.json({ success: false, error: "Credenciais HorsePay não configuradas" }, { status: 500 })
    }

    console.log("Making request to HorsePay API...")
    const response = await fetch("https://api.horsepay.io/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log("HorsePay API Response Status:", response.status)
    console.log("HorsePay API Response:", responseText)

    if (response.ok) {
      const data = JSON.parse(responseText)
      return NextResponse.json({ success: true, access_token: data.access_token })
    } else {
      return NextResponse.json(
        { success: false, error: `HTTP ${response.status}: ${responseText}` },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("Erro na autenticação HorsePay:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
