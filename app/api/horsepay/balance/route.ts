import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Sistema de rodízio: 75% primário, 25% secundário
    const usePrimary = Math.random() < 0.75

    let clientKey: string
    let clientSecret: string

    if (usePrimary) {
      // Credenciais primárias (75% das vezes)
      clientKey = process.env.HORSEPAY_CLIENT_KEY || ""
      clientSecret = process.env.HORSEPAY_CLIENT_SECRET || ""
      console.log("Using PRIMARY HorsePay credentials for balance check")
    } else {
      // Credenciais secundárias (25% das vezes)
      clientKey = process.env.HORSEPAY_CLIENT_KEY_SECONDARY || ""
      clientSecret = process.env.HORSEPAY_CLIENT_SECRET_SECONDARY || ""
      console.log("Using SECONDARY HorsePay credentials for balance check")
    }

    // Validate that we have the required credentials
    if (!clientKey || !clientSecret) {
      console.error("Missing HorsePay credentials for balance check")
      return NextResponse.json({ success: false, error: "Credenciais HorsePay não configuradas" }, { status: 500 })
    }

    console.log("🔑 Authenticating with HorsePay for balance check...")

    // First, authenticate to get the token
    const authResponse = await fetch("https://api.horsepay.io/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_key: clientKey,
        client_secret: clientSecret,
      }),
    })

    const authResponseText = await authResponse.text()
    console.log("HorsePay Auth Response Status:", authResponse.status)
    console.log("HorsePay Auth Response:", authResponseText.substring(0, 300))

    if (!authResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Auth failed: HTTP ${authResponse.status}` },
        { status: authResponse.status },
      )
    }

    let authData
    try {
      authData = JSON.parse(authResponseText)
    } catch (parseError) {
      console.error("Failed to parse auth response:", parseError)
      return NextResponse.json({ success: false, error: "Invalid auth response format" }, { status: 500 })
    }

    // Check for different possible token field names
    const token = authData.access_token || authData.token || authData.accessToken || authData.bearer_token

    if (!token) {
      console.error("No token found in auth response. Available fields:", Object.keys(authData))
      return NextResponse.json({ success: false, error: "No token in auth response" }, { status: 500 })
    }

    console.log("✅ Token obtained successfully")
    console.log("💰 Fetching balance...")

    // Now fetch the balance
    const balanceResponse = await fetch("https://api.horsepay.io/user/balance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    const balanceResponseText = await balanceResponse.text()
    console.log("HorsePay Balance Response Status:", balanceResponse.status)
    console.log("HorsePay Balance Response:", balanceResponseText.substring(0, 300))

    if (!balanceResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Balance fetch failed: HTTP ${balanceResponse.status}` },
        { status: balanceResponse.status },
      )
    }

    let balanceData
    try {
      balanceData = JSON.parse(balanceResponseText)
    } catch (parseError) {
      console.error("Failed to parse balance response:", parseError)
      return NextResponse.json({ success: false, error: "Invalid balance response format" }, { status: 500 })
    }

    // Check for different possible balance field names
    const balance = balanceData.balance || balanceData.amount || balanceData.available_balance || 0

    console.log("✅ Balance fetched successfully:", balance)

    return NextResponse.json({
      success: true,
      balance: Number(balance) || 0,
    })
  } catch (error) {
    console.error("Erro ao consultar saldo HorsePay:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
