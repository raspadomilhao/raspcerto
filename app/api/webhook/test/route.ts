import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Simular um callback de depósito exatamente como mostrado na imagem
    const testDepositPayload = {
      external_id: 1154206, // Mesmo ID da imagem
      status: "true", // Exatamente como a HorsePay envia
      amount: 1.01, // Mesmo valor da imagem (R$ 1.01)
    }

    console.log(
      "🧪 Simulando webhook REAL da HorsePay (ID: 1154206, Status: 'true'):",
      JSON.stringify(testDepositPayload, null, 2),
    )

    // Enviar para o próprio webhook
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "https://raspadinhadomilhao.vercel.app"}/api/webhook/horsepay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testDepositPayload),
      },
    )

    const result = await response.json()
    console.log("🧪 Resposta do webhook:", JSON.stringify(result, null, 2))

    return NextResponse.json({
      success: true,
      message: "Webhook de teste enviado - Simulando caso real da imagem",
      test_payload: testDepositPayload,
      webhook_response: result,
      webhook_status: response.status,
      note: "Teste baseado na imagem: ID 1154206, Status 'true', Valor R$ 1.01 - CREDITAÇÃO AUTOMÁTICA",
    })
  } catch (error) {
    console.error("❌ Erro ao testar webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao testar webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
