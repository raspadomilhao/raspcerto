"use client"

import { useState, useEffect } from "react"
import { Wallet } from "lucide-react"
import { AuthClient } from "@/lib/auth-client"

interface UserProfile {
  user: {
    id: number
    email: string
    name: string
  }
  wallet: {
    balance: string | number
  }
}

const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0.00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0.00" : numValue.toFixed(2)
}

interface FloatingBalanceProps {
  userProfile: UserProfile | null
  onBalanceUpdate?: (newBalance: number) => void
}

export function FloatingBalance({ userProfile, onBalanceUpdate }: FloatingBalanceProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentBalance, setCurrentBalance] = useState<string | number>(0)

  useEffect(() => {
    if (userProfile?.wallet?.balance) {
      setCurrentBalance(userProfile.wallet.balance)
    }
  }, [userProfile])

  useEffect(() => {
    const handleScroll = () => {
      // Mostrar o saldo flutuante quando rolar mais de 100px
      setIsVisible(window.scrollY > 100)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Função para atualizar o saldo em tempo real
  const updateBalance = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")
      if (response.ok) {
        const profile = await response.json()
        const newBalance = Number.parseFloat(profile.wallet.balance?.toString() || "0")
        setCurrentBalance(profile.wallet.balance)
        if (onBalanceUpdate) {
          onBalanceUpdate(newBalance)
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar saldo:", error)
    }
  }

  // Atualizar saldo a cada 5 segundos quando visível
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(updateBalance, 5000)
      return () => clearInterval(interval)
    }
  }, [isVisible])

  if (!userProfile || !isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <Wallet className="h-4 w-4 text-green-400" />
          <span className="text-green-400 font-bold text-sm">R$ {formatCurrency(currentBalance)}</span>
        </div>
        <div className="text-xs text-gray-400 text-center mt-1">Saldo atual</div>
      </div>
    </div>
  )
}
