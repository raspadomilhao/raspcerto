import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Lista expandida de nomes brasileiros para bots
const botNames = [
  "Carlos M.",
  "Ana S.",
  "Pedro L.",
  "Julia R.",
  "Roberto K.",
  "Maria F.",
  "João P.",
  "Fernanda C.",
  "Ricardo T.",
  "Camila B.",
  "Bruno H.",
  "Larissa M.",
  "Diego A.",
  "Patrícia V.",
  "Marcos L.",
  "Beatriz O.",
  "Rafael N.",
  "Gabriela S.",
  "Lucas E.",
  "Amanda R.",
  "Thiago M.",
  "Juliana P.",
  "Felipe G.",
  "Carla D.",
  "André W.",
  "Renata L.",
  "Gustavo F.",
  "Priscila B.",
  "Rodrigo C.",
  "Vanessa T.",
  "Daniel K.",
  "Tatiana M.",
  "Leandro S.",
  "Cristina A.",
  "Fábio R.",
  "Mônica H.",
  "Vinicius L.",
  "Simone P.",
  "Eduardo N.",
  "Adriana G.",
  "Marcelo D.",
  "Luciana F.",
  "Alessandro B.",
  "Karina S.",
  "Henrique M.",
  "Débora R.",
  "William T.",
  "Eliane C.",
  "Matheus A.",
  "Silvia L.",
]

const gameNames = ["Raspe da Esperança", "Fortuna Dourada", "Mega Sorte"]

// Prêmios mais variados e realistas
const prizes = {
  "Raspe da Esperança": [2, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000],
  "Fortuna Dourada": [5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000],
  "Mega Sorte": [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2500, 5000, 7500, 10000],
}

// Cidades brasileiras para adicionar mais realismo
const cities = [
  "São Paulo - SP",
  "Rio de Janeiro - RJ",
  "Belo Horizonte - MG",
  "Salvador - BA",
  "Brasília - DF",
  "Fortaleza - CE",
  "Curitiba - PR",
  "Recife - PE",
  "Porto Alegre - RS",
  "Manaus - AM",
  "Belém - PA",
  "Goiânia - GO",
  "Guarulhos - SP",
  "Campinas - SP",
  "São Luís - MA",
  "São Gonçalo - RJ",
  "Maceió - AL",
  "Duque de Caxias - RJ",
  "Natal - RN",
  "Teresina - PI",
]

function generateBotWinners(count: number) {
  const bots = []
  const usedNames = new Set()

  for (let i = 0; i < count; i++) {
    // Garantir que não repetimos nomes na mesma geração
    let name
    do {
      name = botNames[Math.floor(Math.random() * botNames.length)]
    } while (usedNames.has(name) && usedNames.size < botNames.length)

    usedNames.add(name)

    const game = gameNames[Math.floor(Math.random() * gameNames.length)]
    const gamePrizes = prizes[game as keyof typeof prizes]

    // Prêmios menores são mais comuns (80% chance), prêmios maiores são mais raros (20% chance)
    let prize
    if (Math.random() < 0.8) {
      // 80% chance de prêmio pequeno/médio (primeiros 60% da lista)
      const smallPrizes = gamePrizes.slice(0, Math.ceil(gamePrizes.length * 0.6))
      prize = smallPrizes[Math.floor(Math.random() * smallPrizes.length)]
    } else {
      // 20% chance de prêmio grande (últimos 40% da lista)
      const bigPrizes = gamePrizes.slice(Math.ceil(gamePrizes.length * 0.6))
      prize = bigPrizes[Math.floor(Math.random() * bigPrizes.length)]
    }

    // Gerar timestamp aleatório entre 30 segundos e 3 horas atrás
    const minutesAgo = Math.floor(Math.random() * 180) + 0.5 // 0.5 a 180.5 minutos
    const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000)

    // Adicionar cidade aleatória ocasionalmente
    const city = Math.random() < 0.3 ? cities[Math.floor(Math.random() * cities.length)] : null

    bots.push({
      id: `bot_${Date.now()}_${i}`,
      user_name: name,
      game_name: game,
      prize_amount: prize,
      created_at: timestamp.toISOString(),
      is_bot: true,
      city: city, // Campo adicional para mais realismo
    })
  }

  return bots
}

// Função para gerar vencedores especiais (jackpots ocasionais)
function generateSpecialWinners() {
  const specialWinners = []

  // 10% chance de ter um jackpot recente
  if (Math.random() < 0.1) {
    const jackpotPrizes = [5000, 7500, 10000, 15000, 20000]
    const jackpotGames = ["Mega Sorte", "Fortuna Dourada"]

    const name = botNames[Math.floor(Math.random() * botNames.length)]
    const game = jackpotGames[Math.floor(Math.random() * jackpotGames.length)]
    const prize = jackpotPrizes[Math.floor(Math.random() * jackpotPrizes.length)]

    // Jackpot entre 10 minutos e 2 horas atrás
    const minutesAgo = Math.floor(Math.random() * 110) + 10
    const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000)

    specialWinners.push({
      id: `jackpot_${Date.now()}`,
      user_name: name,
      game_name: game,
      prize_amount: prize,
      created_at: timestamp.toISOString(),
      is_bot: true,
      is_jackpot: true,
    })
  }

  return specialWinners
}

export async function GET(request: NextRequest) {
  try {
    // Buscar vencedores reais das últimas 24 horas
    const realWinners = await sql`
      SELECT 
        t.id,
        u.name as user_name,
        'Raspadinha' as game_name,
        t.amount as prize_amount,
        t.created_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type = 'game_prize' 
        AND t.amount > 0
        AND t.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY t.created_at DESC
      LIMIT 5
    `

    // Gerar bots dinâmicos (quantidade varia entre 18-25)
    const botCount = Math.floor(Math.random() * 8) + 18 // 18 a 25 bots
    const botWinners = generateBotWinners(botCount)

    // Gerar vencedores especiais ocasionalmente
    const specialWinners = generateSpecialWinners()

    // Combinar todos os vencedores
    const allWinners = [
      ...realWinners.map((winner) => ({
        ...winner,
        is_bot: false,
      })),
      ...specialWinners,
      ...botWinners,
    ]

    // Embaralhar e ordenar por data mais recente, limitando a 25
    const sortedWinners = allWinners
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 25)

    return NextResponse.json({
      success: true,
      winners: sortedWinners,
      total: sortedWinners.length,
      real_winners: realWinners.length,
      bot_winners: botWinners.length + specialWinners.length,
    })
  } catch (error) {
    console.error("Erro ao buscar vencedores:", error)

    // Em caso de erro, retornar apenas bots
    const emergencyBots = generateBotWinners(20)
    const emergencySpecial = generateSpecialWinners()

    return NextResponse.json({
      success: true,
      winners: [...emergencySpecial, ...emergencyBots].slice(0, 20),
      total: 20,
      real_winners: 0,
      bot_winners: 20,
      error: "Dados simulados devido a erro na base de dados",
    })
  }
}
