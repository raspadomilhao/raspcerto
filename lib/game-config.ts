// Configurações dos jogos baseadas no tipo de usuário
export interface GameConfig {
  winChance: number // Porcentagem de chance de ganhar (0-100)
  multipliers: number[] // Multiplicadores possíveis
  maxPrize: number // Prêmio máximo
  minPrize: number // Prêmio mínimo
}

export interface GameConfigs {
  regular: GameConfig
  blogger: GameConfig
}

// Configurações para Raspe da Esperança (R$ 1,00)
export const raspeEsperancaConfig: GameConfigs = {
  regular: {
    winChance: 15, // 15% de chance
    multipliers: [2, 3, 5, 10, 20, 50, 100, 500, 1000], // Até 1000x
    maxPrize: 1000, // R$ 1.000
    minPrize: 2, // R$ 2,00
  },
  blogger: {
    winChance: 90, // 90% de chance
    multipliers: [5, 10, 25, 50, 100, 200, 500, 1000, 5000, 10000, 25000, 50000], // Até 50.000x
    maxPrize: 50000, // R$ 50.000
    minPrize: 5, // R$ 5,00
  },
}

// Configurações para Fortuna Dourada (R$ 3,00)
export const fortunaDouradaConfig: GameConfigs = {
  regular: {
    winChance: 15, // 15% de chance
    multipliers: [2, 3, 5, 8, 15, 25, 50, 100, 500, 1000, 1666], // Até 1666x (R$ 5.000)
    maxPrize: 5000, // R$ 5.000
    minPrize: 6, // R$ 6,00
  },
  blogger: {
    winChance: 90, // 90% de chance
    multipliers: [5, 10, 20, 50, 100, 200, 500, 1000, 2500, 5000, 10000, 25000], // Até 25.000x
    maxPrize: 75000, // R$ 75.000
    minPrize: 15, // R$ 15,00
  },
}

// Configurações para Mega Sorte (R$ 5,00)
export const megaSorteConfig: GameConfigs = {
  regular: {
    winChance: 15, // 15% de chance
    multipliers: [2, 3, 5, 10, 20, 40, 80, 200, 500, 1000, 2000], // Até 2000x (R$ 10.000)
    maxPrize: 10000, // R$ 10.000
    minPrize: 10, // R$ 10,00
  },
  blogger: {
    winChance: 90, // 90% de chance
    multipliers: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 12500, 25000], // Até 25.000x
    maxPrize: 125000, // R$ 125.000
    minPrize: 25, // R$ 25,00
  },
}

// Função para obter configuração do jogo
export function getGameConfig(gameName: string, userType = "regular"): GameConfig {
  const type = userType === "blogger" ? "blogger" : "regular"

  switch (gameName) {
    case "raspe-da-esperanca":
      return raspeEsperancaConfig[type]
    case "fortuna-dourada":
      return fortunaDouradaConfig[type]
    case "mega-sorte":
      return megaSorteConfig[type]
    default:
      return raspeEsperancaConfig[type]
  }
}

// Função para calcular se o jogador ganhou
export function calculateGameResult(
  config: GameConfig,
  betAmount: number,
): {
  won: boolean
  prize: number
  multiplier: number
} {
  const random = Math.random() * 100
  const won = random <= config.winChance

  if (!won) {
    return { won: false, prize: 0, multiplier: 0 }
  }

  // Escolher multiplicador aleatório
  const multiplier = config.multipliers[Math.floor(Math.random() * config.multipliers.length)]
  let prize = betAmount * multiplier

  // Garantir que o prêmio está dentro dos limites
  prize = Math.min(prize, config.maxPrize)
  prize = Math.max(prize, config.minPrize)

  return { won: true, prize, multiplier }
}

// Função para verificar se é blogueiro baseado no email
export function isBloggerEmail(email: string): boolean {
  const bloggerDomains = ["@blogger", "@influencer"]
  return bloggerDomains.some((domain) => email.toLowerCase().includes(domain))
}
