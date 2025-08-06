// Helper function to ensure URL has protocol
function ensureHttps(url: string): string {
  if (!url) return "https://v0-raspcerto.vercel.app"
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}

const baseUrl = ensureHttps(process.env.NEXT_PUBLIC_BASE_URL || "v0-raspcerto.vercel.app")

export const config = {
  baseUrl,
  webhookUrl: `${baseUrl}/api/webhook/horsepay`,

  // Configurações dos jogos
  games: {
    "raspe-da-esperanca": {
      name: "Raspe da Esperanca",
      price: 1.0,
      maxPrize: 1000.0,
      bloggerMaxPrize: 50000.0,
      winChance: 0.15,
    },
    "fortuna-dourada": {
      name: "Fortuna Dourada",
      price: 3.0,
      maxPrize: 5000.0,
      bloggerMaxPrize: 75000.0,
      winChance: 0.12,
    },
    "mega-sorte": {
      name: "Mega Sorte",
      price: 5.0,
      maxPrize: 10000.0,
      bloggerMaxPrize: 125000.0,
      winChance: 0.1,
    },
  },

  // Configurações do sistema
  system: {
    minWithdraw: 10.0,
    maxWithdraw: 5000.0,
    withdrawFee: 0.02,
  },
}

export default config
