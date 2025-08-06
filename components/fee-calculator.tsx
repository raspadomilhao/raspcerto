"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calculator, AlertTriangle, Info } from "lucide-react"

interface FeeCalculatorProps {
  onAmountChange?: (grossAmount: number, netAmount: number, fee: number) => void
}

export function FeeCalculator({ onAmountChange }: FeeCalculatorProps) {
  const [amount, setAmount] = useState("")

  // Taxa fixa da HorsePay (baseado na sua observação)
  const HORSEPAY_FEE = 0.8

  const grossAmount = Number.parseFloat(amount) || 0
  const fee = grossAmount > 0 ? HORSEPAY_FEE : 0
  const netAmount = Math.max(0, grossAmount - fee)
  const feePercentage = grossAmount > 0 ? (fee / grossAmount) * 100 : 0

  // Chamar callback quando valores mudarem
  if (onAmountChange && grossAmount > 0) {
    onAmountChange(grossAmount, netAmount, fee)
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-800">
          <Calculator className="h-5 w-5" />
          <span>Calculadora de Taxas</span>
        </CardTitle>
        <CardDescription className="text-orange-700">
          A HorsePay cobra uma taxa fixa de R$ 0,80 por transação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Valor que você quer depositar (R$)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {grossAmount > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border">
                <Label className="text-sm text-gray-600">Valor Bruto</Label>
                <p className="text-lg font-bold text-blue-600">R$ {grossAmount.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <Label className="text-sm text-gray-600">Taxa HorsePay</Label>
                <p className="text-lg font-bold text-red-600">- R$ {fee.toFixed(2)}</p>
                <Badge variant="destructive" className="text-xs mt-1">
                  {feePercentage.toFixed(1)}%
                </Badge>
              </div>
              <div className="bg-white p-3 rounded border">
                <Label className="text-sm text-gray-600">Você Recebe</Label>
                <p className="text-lg font-bold text-green-600">R$ {netAmount.toFixed(2)}</p>
              </div>
            </div>

            {feePercentage > 50 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Taxa muito alta!</strong> A taxa representa {feePercentage.toFixed(1)}% do valor. Considere
                  depositar um valor maior para diluir o custo da taxa.
                </AlertDescription>
              </Alert>
            )}

            {netAmount <= 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Valor insuficiente!</strong> O valor deve ser maior que R$ 0,80 para cobrir a taxa.
                </AlertDescription>
              </Alert>
            )}

            {grossAmount >= 5 && feePercentage <= 20 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Boa escolha!</strong> Com este valor, a taxa representa apenas {feePercentage.toFixed(1)}% do
                  depósito.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
          <strong>💡 Dica:</strong> Para otimizar custos, considere fazer depósitos maiores. Por exemplo: R$ 5,00 (taxa
          de 16%) ou R$ 10,00 (taxa de 8%).
        </div>
      </CardContent>
    </Card>
  )
}
