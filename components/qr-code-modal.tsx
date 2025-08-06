"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, Copy, CheckCircle, Clock, Wallet, Zap, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PaymentOrder {
  copy_past: string
  external_id: number
  payer_name: string
  payment: string
  status: number
}

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  paymentOrder: PaymentOrder
  onPaymentDetected?: () => void
  isBlogger?: boolean
  isCheckingPayment?: boolean
}

export function QRCodeModal({
  isOpen,
  onClose,
  paymentOrder,
  onPaymentDetected,
  isBlogger = false,
  isCheckingPayment = false,
}: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutos em segundos
  const [paymentDetected, setPaymentDetected] = useState(false)
  const [bloggerCountdown, setBloggerCountdown] = useState(7)
  const [qrCodeError, setQrCodeError] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  // Countdown para expiração do PIX
  useEffect(() => {
    if (!isOpen || paymentDetected) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, paymentDetected])

  // Countdown especial para blogger (simulação)
  useEffect(() => {
    if (!isOpen || !isBlogger || paymentDetected) return

    const timer = setInterval(() => {
      setBloggerCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setPaymentDetected(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, isBlogger, paymentDetected])

  // Polling para verificar pagamento via webhook
  useEffect(() => {
    if (!isOpen || paymentDetected || isBlogger) return

    setIsPolling(true)

    const checkPayment = async () => {
      try {
        const response = await fetch("/api/webhook/horsepay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            external_id: paymentOrder.external_id,
            status: "check", // Indicador para verificar status
          }),
        })

        if (response.ok) {
          const data = await response.json()

          if (data.payment_confirmed || data.status === "paid" || data.status === "completed") {
            setPaymentDetected(true)
            setIsPolling(false)

            toast({
              title: "Pagamento confirmado!",
              description: "Seu depósito foi creditado com sucesso.",
            })
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error)
      }
    }

    // Verificar imediatamente
    checkPayment()

    // Verificar a cada 5 segundos
    const interval = setInterval(checkPayment, 5000)

    // Parar após 15 minutos
    const timeout = setTimeout(
      () => {
        clearInterval(interval)
        setIsPolling(false)
      },
      15 * 60 * 1000,
    )

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      setIsPolling(false)
    }
  }, [isOpen, paymentDetected, paymentOrder.external_id, isBlogger])

  // Separate effect to handle payment detection callback
  useEffect(() => {
    if (paymentDetected && onPaymentDetected) {
      onPaymentDetected()
    }
  }, [paymentDetected, onPaymentDetected])

  // Copiar código PIX
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentOrder.copy_past)
      setCopied(true)
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de banco para pagar.",
      })
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente.",
        variant: "destructive",
      })
    }
  }

  // Formatar tempo restante
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Função para gerar QR Code usando API externa
  const generateQRCodeUrl = (pixCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[95vh] overflow-y-auto bg-slate-900 border-purple-500/30 text-white p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-center space-x-2 text-center text-lg sm:text-xl">
            <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            <span>Pagamento PIX</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Status do pagamento */}
          {paymentDetected ? (
            <Card className="bg-green-500/20 border-green-400/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-400 mx-auto mb-2 sm:mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-green-400 mb-1 sm:mb-2">Pagamento Confirmado!</h3>
                <p className="text-green-300 text-xs sm:text-sm">Seu saldo foi atualizado com sucesso.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Informações do pedido */}
              <div className="text-center space-y-2">
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/50 text-xs sm:text-sm">
                  Pedido #{paymentOrder.external_id}
                </Badge>
                <p className="text-gray-300 text-sm sm:text-base">Pagador: {paymentOrder.payer_name}</p>

                {/* Status de verificação */}
                {isPolling && (
                  <div className="flex items-center justify-center space-x-2 text-blue-400">
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span className="text-xs sm:text-sm">Verificando pagamento...</span>
                  </div>
                )}

                {timeLeft > 0 ? (
                  <div className="flex items-center justify-center space-x-2 text-orange-400">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-mono text-base sm:text-lg">{formatTime(timeLeft)}</span>
                  </div>
                ) : (
                  <p className="text-red-400 font-medium text-sm sm:text-base">PIX expirado</p>
                )}
              </div>

              {/* QR Code */}
              <div className="text-center">
                <div className="bg-white p-2 sm:p-4 rounded-lg inline-block mb-3 sm:mb-4">
                  {paymentOrder.payment && !qrCodeError ? (
                    <img
                      src={
                        paymentOrder.payment.startsWith("data:image")
                          ? paymentOrder.payment
                          : paymentOrder.payment.startsWith("iVBOR") || paymentOrder.payment.startsWith("/9j/")
                            ? `data:image/png;base64,${paymentOrder.payment}`
                            : generateQRCodeUrl(paymentOrder.copy_past)
                      }
                      alt="QR Code PIX"
                      className="w-32 h-32 sm:w-48 sm:h-48 mx-auto"
                      onError={() => setQrCodeError(true)}
                    />
                  ) : (
                    <img
                      src={generateQRCodeUrl(paymentOrder.copy_past) || "/placeholder.svg"}
                      alt="QR Code PIX"
                      className="w-32 h-32 sm:w-48 sm:h-48 mx-auto"
                      onError={() => {
                        console.error("Erro ao carregar QR Code")
                      }}
                    />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-400">Escaneie o QR Code com seu app de banco</p>
              </div>

              {/* Código Copia e Cola */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-gray-300">Código PIX:</span>
                  <Button
                    onClick={copyToClipboard}
                    size="sm"
                    className={`${
                      copied ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600"
                    } text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-slate-800 p-2 sm:p-3 rounded-lg border border-slate-600">
                  <p className="text-[10px] sm:text-xs text-gray-300 font-mono break-all leading-relaxed">
                    {paymentOrder.copy_past}
                  </p>
                </div>
              </div>

              {/* Instruções */}
              <Card className="bg-slate-800/50 border-slate-600">
                <CardContent className="p-3 sm:p-4">
                  <h4 className="font-medium text-white mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-purple-400" />
                    Como pagar:
                  </h4>
                  <ol className="text-xs sm:text-sm text-gray-300 space-y-1 sm:space-y-2">
                    <li className="flex items-start">
                      <span className="bg-purple-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs mr-2 mt-0.5 flex-shrink-0">
                        1
                      </span>
                      <span className="leading-relaxed">Abra o app do seu banco</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-purple-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs mr-2 mt-0.5 flex-shrink-0">
                        2
                      </span>
                      <span className="leading-relaxed">Escaneie o QR Code ou cole o código PIX</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-purple-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs mr-2 mt-0.5 flex-shrink-0">
                        3
                      </span>
                      <span className="leading-relaxed">Confirme o pagamento</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-purple-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs mr-2 mt-0.5 flex-shrink-0">
                        4
                      </span>
                      <span className="leading-relaxed">Aguarde a confirmação automática</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              {/* Status de verificação detalhado */}
              {isPolling && (
                <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-2 sm:p-3">
                  <div className="flex items-start space-x-2">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
                    <div>
                      <p className="text-blue-400 font-medium text-xs sm:text-sm">Verificando Pagamento</p>
                      <p className="text-blue-300 text-[10px] sm:text-xs leading-relaxed">
                        Estamos verificando automaticamente se o pagamento foi processado. Você será notificado assim
                        que for confirmado.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Aviso de segurança */}
              <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-2 sm:p-3">
                <div className="flex items-start space-x-2">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 font-medium text-xs sm:text-sm">Pagamento Seguro</p>
                    <p className="text-green-300 text-[10px] sm:text-xs leading-relaxed">
                      Seu depósito será creditado automaticamente após a confirmação do pagamento. Verificação
                      automática ativa.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent text-sm sm:text-base py-2 sm:py-3"
            >
              {paymentDetected ? "Fechar" : "Cancelar"}
            </Button>
            {!paymentDetected && (
              <Button
                onClick={copyToClipboard}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm sm:text-base py-2 sm:py-3"
              >
                <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Copiar PIX
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
