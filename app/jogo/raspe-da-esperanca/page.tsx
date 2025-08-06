"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Wallet, Heart, Volume2, VolumeX } from "lucide-react"
import { AuthClient } from "@/lib/auth-client"
import { toast } from "@/hooks/use-toast"
import { FloatingBalance } from "@/components/floating-balance"
import Link from "next/link"

interface UserProfile {
  user: {
    id: number
    email: string
    name: string
    user_type?: string
  }
  wallet: {
    balance: string | number
  }
}

interface GameState {
  scratchCanvases: HTMLCanvasElement[]
  contexts: CanvasRenderingContext2D[]
  scratchedAreas: number[]
  isScratching: boolean
  lastX: number
  lastY: number
  revealedCellsCount: number
  gameEnded: boolean
  hasWonRealPrize: boolean
  realPrizeAmount: number
}

const NUM_CELLS = 9
const GAME_PRICE = 1.0
const MAX_REPETITIONS_FOR_NON_WINNING = 2
const MAX_REPETITIONS_FOR_NON_WINNING_IN_WINNING_CARD = 2

// Configurações para usuários regulares
const regularConfig = {
  winFrequency: 0.65, // 65% de chance de ganhar
  scratchThreshold: 0.7,
  prizeConfig: {
    small: {
      values: [0.5, 0.75, 1, 2],
      frequency: 0.94,
    },
    medium: {
      values: [3, 4],
      frequency: 0.05,
    },
    large: {
      values: [5],
      frequency: 0.01,
    },
  },
}

// Configurações para bloggers - CONFIGURE AQUI OS PRÊMIOS PARA BLOGGERS
const bloggerConfig = {
  winFrequency: 0.75, // 65% de chance de ganhar para bloggers
  scratchThreshold: 0.7,
  prizeConfig: {
    small: {
      values: [0.5, 0.75, 1, 2], // Prêmios pequenos para bloggers
      frequency: 0.6, // 60% dos ganhos são prêmios pequenos
    },
    medium: {
      values: [10, 25, 150], // Prêmios médios para bloggers
      frequency: 0.3, // 30% dos ganhos são prêmios médios
    },
    large: {
      values: [1000], // Prêmios grandes para bloggers
      frequency: 0.1, // 10% dos ganhos são prêmios grandes
    },
  },
}

const winningSymbols = [
  ...regularConfig.prizeConfig.small.values,
  ...regularConfig.prizeConfig.medium.values,
  ...regularConfig.prizeConfig.large.values,
  ...bloggerConfig.prizeConfig.small.values,
  ...bloggerConfig.prizeConfig.medium.values,
  ...bloggerConfig.prizeConfig.large.values,
].map((val) => `R$${val}`)
const nonWinningSymbols = ["iPhone", "iPad", "Moto", "R$20", "R$50", "R$100", "R$1000"]
const allSymbols = [...winningSymbols, ...nonWinningSymbols]

const symbolImageMap = {
  Casa: { url: "https://i.imgur.com/jG8STSH.png", legend: "Casa 250 MIL" },
  Dinheiro: { url: "https://i.imgur.com/AgS9FWk.png", legendPrefix: "R$" },
  iPhone: { url: "https://i.imgur.com/BxHjbgA.png", legend: "iPhone PRO MAX" },
  iPad: { url: "https://i.imgur.com/QYO2bE6.png", legend: "iPad" },
  Moto: { url: "https://i.imgur.com/vfSBScB.png", legend: "CG 160" },
  Carro: { url: "https://i.imgur.com/8xKjP2m.png", legend: "Carro 0KM" },
  Ouro: { url: "https://i.imgur.com/9mNvQ4r.png", legend: "Ouro" },
  Diamante: { url: "https://i.imgur.com/7kLmR3s.png", legend: "Diamante" },
}

const winMessages = [
  "Esperança premiada! Ganhou R$@valor@!",
  "Parabéns! A esperança te trouxe R$@valor@!",
  "Que alegria! R$@valor@ na sua conta!",
]

const loseMessages = [
  "Não foi desta vez, mas a esperança nunca morre!",
  "Continue tentando, a sorte está chegando!",
  "A próxima raspadinha pode ser a sua!",
]

const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0.00"
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value
  return isNaN(numValue) ? "0.00" : numValue.toFixed(2)
}

// Função para verificar se é blogger - CORRIGIDA
const isBlogger = (userProfile: UserProfile | null): boolean => {
  if (!userProfile) return false

  console.log("🔍 Verificando se é blogger:", {
    user_type: userProfile.user.user_type,
    email: userProfile.user.email,
  })

  // Verificar por tipo de usuário (campo correto é user_type)
  if (userProfile.user.user_type === "blogger") {
    console.log("✅ Detectado como blogger por user_type")
    return true
  }

  // Verificar por email (fallback)
  const bloggerEmails = [
    "blogueiro@teste.com",
    "influencer@demo.com",
    "streamer@content.com",
    "youtuber@test.com",
    "content@creator.com",
  ]

  const isBloggerByEmail = bloggerEmails.includes(userProfile.user.email.toLowerCase())
  if (isBloggerByEmail) {
    console.log("✅ Detectado como blogger por email")
  } else {
    console.log("❌ Não é blogger")
  }

  return isBloggerByEmail
}

export default function RaspeDaEsperancaPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [gameLoading, setGameLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"win" | "lose">("lose")
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")
  const [message, setMessage] = useState("Clique ou arraste para raspar!")
  const [canPlay, setCanPlay] = useState(false)
  const [gameActive, setGameActive] = useState(false)

  const router = useRouter()
  const scratchGridRef = useRef<HTMLDivElement>(null)
  const gameStateRef = useRef<GameState>({
    scratchCanvases: [],
    contexts: [],
    scratchedAreas: [],
    isScratching: false,
    lastX: 0,
    lastY: 0,
    revealedCellsCount: 0,
    gameEnded: false,
    hasWonRealPrize: false,
    realPrizeAmount: 0,
  })

  // Audio refs
  const audioScratchRef = useRef<HTMLAudioElement>(null)
  const audioWinRef = useRef<HTMLAudioElement>(null)
  const audioLoseRef = useRef<HTMLAudioElement>(null)
  const audioCoinRef = useRef<HTMLAudioElement>(null)

  // Ref para a imagem de scratch
  const scratchImageRef = useRef<HTMLImageElement>(null)

  // Função para obter configuração baseada no tipo de usuário
  const getGameConfig = () => {
    const config = isBlogger(userProfile) ? bloggerConfig : regularConfig
    console.log("🎮 Usando configuração:", isBlogger(userProfile) ? "BLOGGER" : "REGULAR", config)
    return config
  }

  useEffect(() => {
    const token = AuthClient.getToken()
    if (token) {
      setIsLoggedIn(true)
      fetchUserProfile()
    } else {
      router.push("/auth")
    }

    // Pré-carregar a imagem de scratch
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = "/images/scratch-overlay.jpeg"
    img.onload = () => {
      scratchImageRef.current = img
    }
  }, [router])

  const fetchUserProfile = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/user/profile")
      if (response.ok) {
        const profile = await response.json()
        console.log("👤 Perfil carregado:", profile)
        setUserProfile(profile)
        const currentBalance = Number.parseFloat(profile.wallet.balance?.toString() || "0")
        setCanPlay(currentBalance >= GAME_PRICE)
      } else if (response.status === 401) {
        router.push("/auth")
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBalanceUpdate = (newBalance: number) => {
    setCanPlay(newBalance >= GAME_PRICE)
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        wallet: { ...userProfile.wallet, balance: newBalance },
      })
    }
  }

  const playSound = (audioRef: React.RefObject<HTMLAudioElement>) => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((error) => {
        console.warn("Erro ao reproduzir áudio:", error)
      })
    }
  }

  // Função para gerar prêmio baseado na configuração do tipo de usuário
  const gerarPremioReal = () => {
    const config = getGameConfig()
    const random = Math.random()

    if (random < config.prizeConfig.small.frequency) {
      const randomIndex = Math.floor(Math.random() * config.prizeConfig.small.values.length)
      return config.prizeConfig.small.values[randomIndex]
    } else if (random < config.prizeConfig.small.frequency + config.prizeConfig.medium.frequency) {
      const randomIndex = Math.floor(Math.random() * config.prizeConfig.medium.values.length)
      return config.prizeConfig.medium.values[randomIndex]
    } else {
      const randomIndex = Math.floor(Math.random() * config.prizeConfig.large.values.length)
      return config.prizeConfig.large.values[randomIndex]
    }
  }

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const createSymbolHtml = (symbolId: string) => {
    let imageUrl = ""
    let legendText = ""

    if (symbolId.startsWith("R$")) {
      const value = Number.parseFloat(symbolId.substring(2))
      const config = getGameConfig()
      const allPrizeValues = [
        ...config.prizeConfig.small.values,
        ...config.prizeConfig.medium.values,
        ...config.prizeConfig.large.values,
      ]

      if (allPrizeValues.includes(value)) {
        imageUrl = symbolImageMap["Dinheiro"].url
        legendText = symbolId
      } else {
        imageUrl = symbolImageMap["Dinheiro"].url
        legendText = symbolId
      }
    } else if (symbolImageMap[symbolId as keyof typeof symbolImageMap]) {
      const symbol = symbolImageMap[symbolId as keyof typeof symbolImageMap]
      imageUrl = symbol.url
      legendText = symbol.legend
    } else {
      return { imageUrl: "", legendText: symbolId }
    }

    return { imageUrl, legendText }
  }

  const generateScratchCardSymbols = () => {
    let finalSymbolIds = Array(NUM_CELLS).fill(null)
    const config = getGameConfig()

    gameStateRef.current.hasWonRealPrize = Math.random() < config.winFrequency
    gameStateRef.current.realPrizeAmount = 0

    console.log("🎲 Gerando jogo:", {
      hasWon: gameStateRef.current.hasWonRealPrize,
      winFrequency: config.winFrequency,
      isBlogger: isBlogger(userProfile),
    })

    if (gameStateRef.current.hasWonRealPrize) {
      const winningPrizeAmount = gerarPremioReal()
      const winningSymbolId = `R$${winningPrizeAmount}`
      gameStateRef.current.realPrizeAmount = winningPrizeAmount

      console.log("🏆 Prêmio gerado:", winningPrizeAmount)

      const prizePositions = new Set()
      while (prizePositions.size < 3) {
        prizePositions.add(Math.floor(Math.random() * NUM_CELLS))
      }

      prizePositions.forEach((pos) => {
        finalSymbolIds[pos] = winningSymbolId
      })

      const nonWinningFillPool: string[] = []
      nonWinningSymbols.forEach((symbolId) => {
        for (let k = 0; k < MAX_REPETITIONS_FOR_NON_WINNING_IN_WINNING_CARD; k++) {
          nonWinningFillPool.push(symbolId)
        }
      })
      shuffleArray(nonWinningFillPool)

      let currentFillIndex = 0
      for (let i = 0; i < NUM_CELLS; i++) {
        if (finalSymbolIds[i] === null) {
          finalSymbolIds[i] = nonWinningFillPool[currentFillIndex]
          currentFillIndex++
        }
      }
      shuffleArray(finalSymbolIds)
    } else {
      let generatedValid = false
      while (!generatedValid) {
        let tempSymbolIds = []
        const counts: { [key: string]: number } = {}

        const symbolPoolForNonWinning: string[] = []
        allSymbols.forEach((symbolId) => {
          for (let k = 0; k < MAX_REPETITIONS_FOR_NON_WINNING; k++) {
            symbolPoolForNonWinning.push(symbolId)
          }
        })
        shuffleArray(symbolPoolForNonWinning)

        tempSymbolIds = symbolPoolForNonWinning.slice(0, NUM_CELLS)
        generatedValid = true

        tempSymbolIds.forEach((sym) => {
          counts[sym] = (counts[sym] || 0) + 1
        })

        if (winningSymbols.some((ws) => counts[ws] === 3)) {
          generatedValid = false
        }

        for (const sym in counts) {
          if (counts[sym] > MAX_REPETITIONS_FOR_NON_WINNING) {
            generatedValid = false
            break
          }
        }

        if (generatedValid) {
          finalSymbolIds = tempSymbolIds
        }
      }
      shuffleArray(finalSymbolIds)
    }
    return finalSymbolIds
  }

  const drawScratchLayer = (ctx: CanvasRenderingContext2D, width: number, height: number, cellIndex: number) => {
    if (width === 0 || height === 0) return

    // Se a imagem não estiver carregada, usar o design padrão
    if (!scratchImageRef.current) {
      // Tema rosa/vermelho para Raspe da Esperança
      ctx.fillStyle = "#DC2626"
      ctx.fillRect(0, 0, width, height)

      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, "#F87171")
      gradient.addColorStop(0.5, "#EF4444")
      gradient.addColorStop(1, "#DC2626")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, (Math.min(width, height) / 2) * 0.8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("RASPE", width / 2, height / 2 - 6)
      ctx.fillText("AQUI", width / 2, height / 2 + 6)

      ctx.globalCompositeOperation = "destination-out"
      return
    }

    // Calcular qual pedaço da imagem desenhar (3x3 grid)
    const img = scratchImageRef.current
    const imgWidth = img.naturalWidth
    const imgHeight = img.naturalHeight

    // Calcular posição na grid 3x3
    const row = Math.floor(cellIndex / 3)
    const col = cellIndex % 3

    // Calcular dimensões de cada pedaço
    const pieceWidth = imgWidth / 3
    const pieceHeight = imgHeight / 3

    // Calcular coordenadas de origem na imagem
    const srcX = col * pieceWidth
    const srcY = row * pieceHeight

    // Desenhar o pedaço da imagem
    ctx.drawImage(
      img,
      srcX,
      srcY,
      pieceWidth,
      pieceHeight, // Área de origem na imagem
      0,
      0,
      width,
      height, // Área de destino no canvas
    )

    ctx.globalCompositeOperation = "destination-out"
  }

  const getEventPos = (canvas: HTMLCanvasElement, event: MouseEvent | TouchEvent) => {
    const rect = canvas.getBoundingClientRect()
    let clientX, clientY
    if ("touches" in event) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const checkScratchProgress = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, index: number) => {
    if (canvas.width === 0 || canvas.height === 0) return

    const config = getGameConfig()
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparentPixels = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) {
        transparentPixels++
      }
    }
    const totalPixels = canvas.width * canvas.height
    const percentageScratched = (transparentPixels / totalPixels) * 100

    if (percentageScratched > config.scratchThreshold * 100 && gameStateRef.current.scratchedAreas[index] === 0) {
      gameStateRef.current.scratchedAreas[index] = 1
      revealCell(index)
    }
  }

  const revealCell = (index: number) => {
    const cellCanvas = gameStateRef.current.scratchCanvases[index]
    const cellContent = cellCanvas.previousElementSibling as HTMLElement

    cellCanvas.style.display = "none"
    cellContent.classList.remove("opacity-0", "scale-75")
    cellContent.classList.add("opacity-100", "scale-100")

    gameStateRef.current.revealedCellsCount++
    checkGameEnd()
  }

  const highlightWinningCells = () => {
    const winningSymbol = `R$${gameStateRef.current.realPrizeAmount}`

    // Encontrar e destacar as células com o símbolo premiado
    gameStateRef.current.scratchCanvases.forEach((canvas, index) => {
      const cellContent = canvas.previousElementSibling as HTMLElement
      const symbolSpan = cellContent.querySelector("span")
      const symbolText = symbolSpan?.textContent || cellContent.textContent

      if (symbolText === winningSymbol) {
        // Aplicar efeitos visuais de destaque - tema vermelho/rosa
        cellContent.style.animation = "pulse 1.5s ease-in-out infinite"
        cellContent.style.boxShadow = "0 0 25px rgba(255, 215, 0, 0.8), inset 0 0 25px rgba(255, 215, 0, 0.3)"
        cellContent.style.border = "3px solid #FFD700"
        cellContent.style.backgroundColor = "rgba(255, 215, 0, 0.15)"
        cellContent.style.transform = "scale(1.05)"
        cellContent.style.zIndex = "10"

        // Adicionar brilho extra na imagem se existir
        const img = cellContent.querySelector("img")
        if (img) {
          img.style.filter = "brightness(1.3) drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))"
        }
      }
    })
  }

  const processGameResult = async () => {
    try {
      const response = await AuthClient.makeAuthenticatedRequest("/api/games/raspe-da-esperanca/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameResult: {
            hasWon: gameStateRef.current.hasWonRealPrize,
            prizeAmount: gameStateRef.current.realPrizeAmount,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Atualizar o saldo local com o valor real do servidor
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            wallet: { ...userProfile.wallet, balance: result.newBalance },
          })
          setCanPlay(Number.parseFloat(result.newBalance) >= GAME_PRICE)
        }

        if (result.gameResult.hasWon) {
          toast({
            title: "Raspe da Esperança! Você ganhou!",
            description: `Prêmio de R$ ${result.gameResult.prizeAmount.toFixed(2)} creditado na sua conta!`,
          })
        } else {
          toast({
            title: "Jogo processado",
            description: `R$ ${GAME_PRICE.toFixed(2)} debitado do seu saldo.`,
          })
        }
      } else {
        const error = await response.json()
        toast({
          title: "Erro!",
          description: error.error || "Não foi possível processar o jogo.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao processar resultado do jogo:", error)
      toast({
        title: "Erro!",
        description: "Não foi possível processar o resultado do jogo.",
        variant: "destructive",
      })
    }
  }

  const checkGameEnd = () => {
    if (
      gameStateRef.current.revealedCellsCount === gameStateRef.current.scratchCanvases.length &&
      !gameStateRef.current.gameEnded
    ) {
      gameStateRef.current.gameEnded = true
      setGameActive(false)

      // Processar o resultado do jogo no servidor
      processGameResult()

      if (gameStateRef.current.hasWonRealPrize) {
        // Destacar os campos premiados
        setTimeout(() => {
          highlightWinningCells()
        }, 500) // Pequeno delay para garantir que as células estão reveladas

        const messageText = winMessages[Math.floor(Math.random() * winMessages.length)].replace(
          "@valor@",
          `${gameStateRef.current.realPrizeAmount}`,
        )
        setMessage(messageText)
        playSound(audioWinRef)
        playSound(audioCoinRef)
        setModalType("win")
        setModalTitle("Esperança Premiada!")
        setModalMessage(messageText)
        setShowModal(true)
      } else {
        const messageText = loseMessages[Math.floor(Math.random() * loseMessages.length)]
        setMessage(messageText)
        playSound(audioLoseRef)
        setModalType("lose")
        setModalTitle("Continue Tentando!")
        setModalMessage(messageText)
        setShowModal(true)
      }
    }
  }

  const handleStartScratch = (
    e: MouseEvent | TouchEvent,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    index: number,
  ) => {
    if (gameStateRef.current.gameEnded) return
    gameStateRef.current.isScratching = true
    const pos = getEventPos(canvas, e)
    gameStateRef.current.lastX = pos.x
    gameStateRef.current.lastY = pos.y
    playSound(audioScratchRef)
  }

  const handleScratch = (
    e: MouseEvent | TouchEvent,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    index: number,
  ) => {
    if (!gameStateRef.current.isScratching || gameStateRef.current.gameEnded) return
    e.preventDefault()
    const pos = getEventPos(canvas, e)
    ctx.beginPath()
    ctx.moveTo(gameStateRef.current.lastX, gameStateRef.current.lastY)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "rgba(0,0,0,1)"
    ctx.lineWidth = 40
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()

    gameStateRef.current.lastX = pos.x
    gameStateRef.current.lastY = pos.y

    checkScratchProgress(canvas, ctx, index)
  }

  const handleEndScratch = () => {
    if (gameStateRef.current.isScratching) {
      gameStateRef.current.isScratching = false
      if (audioScratchRef.current && !audioScratchRef.current.paused) {
        audioScratchRef.current.pause()
        audioScratchRef.current.currentTime = 0
      }
    }
  }

  const scratchAllCells = () => {
    if (gameStateRef.current.gameEnded) return

    gameStateRef.current.scratchCanvases.forEach((canvas) => {
      canvas.style.pointerEvents = "none"
    })

    let delay = 0
    for (let i = 0; i < NUM_CELLS; i++) {
      if (gameStateRef.current.scratchedAreas[i] === 0) {
        setTimeout(() => {
          revealCell(i)
          if (i % 2 === 0) playSound(audioScratchRef)
        }, delay)
        delay += 100
      }
    }
  }

  const initGame = async () => {
    if (!canPlay) {
      toast({
        title: "Saldo insuficiente!",
        description: "Você precisa de pelo menos R$ 1,00 para jogar.",
        variant: "destructive",
      })
      router.push("/deposito")
      return
    }

    setGameLoading(true)
    setGameActive(true)

    try {
      // Reset game state first
      gameStateRef.current = {
        scratchCanvases: [],
        contexts: [],
        scratchedAreas: [],
        isScratching: false,
        lastX: 0,
        lastY: 0,
        revealedCellsCount: 0,
        gameEnded: false,
        hasWonRealPrize: false,
        realPrizeAmount: 0,
      }

      setMessage("Clique ou arraste para raspar a esperança!")
      setShowModal(false)

      if (scratchGridRef.current) {
        scratchGridRef.current.innerHTML = ""
      }

      const symbolIds = generateScratchCardSymbols()

      // Create cells
      for (let i = 0; i < NUM_CELLS; i++) {
        const cellContainer = document.createElement("div")
        cellContainer.className =
          "relative w-full pb-[100%] bg-gray-900 rounded-lg overflow-hidden border border-red-400/40 shadow-inner"

        const cellContent = document.createElement("div")
        cellContent.className =
          "absolute inset-0 flex flex-col justify-center items-center text-red-400 font-bold opacity-0 scale-75 transition-all duration-300 bg-gray-800 rounded-lg p-2"

        const symbol = createSymbolHtml(symbolIds[i])
        if (symbol.imageUrl) {
          const img = document.createElement("img")
          img.src = symbol.imageUrl
          img.alt = symbol.legendText
          img.className = "w-full h-auto max-w-[60px] max-h-[60px] object-contain mb-1"
          img.onerror = () => {
            img.src = `https://placehold.co/60x60/DC2626/F87171?text=${encodeURIComponent(symbolIds[i])}`
          }
          cellContent.appendChild(img)

          const legend = document.createElement("span")
          legend.textContent = symbol.legendText
          legend.className = "text-xs text-gray-300"
          cellContent.appendChild(legend)
        } else {
          cellContent.textContent = symbol.legendText
        }

        cellContainer.appendChild(cellContent)

        const canvas = document.createElement("canvas")
        canvas.className = "absolute inset-0 w-full h-full cursor-crosshair touch-none"
        cellContainer.appendChild(canvas)

        if (scratchGridRef.current) {
          scratchGridRef.current.appendChild(cellContainer)
        }

        const ctx = canvas.getContext("2d")!
        gameStateRef.current.contexts.push(ctx)
        gameStateRef.current.scratchCanvases.push(canvas)
        gameStateRef.current.scratchedAreas.push(0)
      }

      // Set canvas size and draw scratch layer after DOM is ready
      setTimeout(() => {
        gameStateRef.current.scratchCanvases.forEach((canvas, i) => {
          const container = canvas.parentElement!
          canvas.width = container.offsetWidth
          canvas.height = container.offsetHeight

          const ctx = gameStateRef.current.contexts[i]
          drawScratchLayer(ctx, canvas.width, canvas.height, i)

          // Add event listeners
          const handleMouseDown = (e: MouseEvent) => handleStartScratch(e, canvas, ctx, i)
          const handleMouseMove = (e: MouseEvent) => handleScratch(e, canvas, ctx, i)
          const handleTouchStart = (e: TouchEvent) => handleStartScratch(e, canvas, ctx, i)
          const handleTouchMove = (e: TouchEvent) => handleScratch(e, canvas, ctx, i)

          canvas.addEventListener("mousedown", handleMouseDown)
          canvas.addEventListener("mousemove", handleMouseMove)
          canvas.addEventListener("mouseup", handleEndScratch)
          canvas.addEventListener("mouseleave", handleEndScratch)

          canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
          canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
          canvas.addEventListener("touchend", handleEndScratch)
          canvas.addEventListener("touchcancel", handleEndScratch)
        })
      }, 200)

      toast({
        title: "Jogo iniciado!",
        description: "Raspe as células para descobrir sua esperança!",
      })
    } catch (error) {
      console.error("Erro ao iniciar jogo:", error)
      toast({
        title: "Erro!",
        description: "Não foi possível iniciar o jogo. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setGameLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Saldo flutuante */}
      <FloatingBalance userProfile={userProfile} onBalanceUpdate={handleBalanceUpdate} />

      {/* Audio elements */}
      <audio ref={audioScratchRef} preload="auto">
        <source src="/sounds/scratch.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={audioWinRef} preload="auto">
        <source src="/sounds/win.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={audioLoseRef} preload="auto">
        <source src="/sounds/lose.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={audioCoinRef} preload="auto">
        <source src="/sounds/coin.mp3" type="audio/mpeg" />
      </audio>

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-transparent to-pink-600/10"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/jogos">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-red-400">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Raspe da Esperança</h1>
                  <p className="text-sm text-gray-400">R$ {GAME_PRICE.toFixed(2)} por jogo</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-gray-300 hover:text-red-400"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              {userProfile && (
                <div className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-bold">R$ {formatCurrency(userProfile.wallet.balance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <Card className="bg-gray-800/50 border-gray-700 p-6">
          {/* Game title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-400 to-red-400 mb-2">
              RASPE DA ESPERANÇA
            </h2>
            <Badge className="bg-red-500 text-white font-bold">Nunca perca a esperança!</Badge>
            <p className="text-gray-400 italic mt-2">{message}</p>
          </div>

          {/* Scratch grid */}
          <div ref={scratchGridRef} className="grid grid-cols-3 gap-1 mb-6" />

          <div className="flex flex-col space-y-4">
            {gameActive && !gameStateRef.current.gameEnded && gameStateRef.current.scratchCanvases.length > 0 && (
              <Button
                onClick={scratchAllCells}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 mt-4"
              >
                Raspar Tudo
              </Button>
            )}

            {!gameActive && (
              <Button
                onClick={initGame}
                disabled={gameLoading || !canPlay}
                className={`w-full font-bold py-3 text-lg ${
                  gameStateRef.current.gameEnded && gameStateRef.current.hasWonRealPrize
                    ? "bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white animate-pulse"
                    : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
                }`}
              >
                {gameLoading
                  ? "Iniciando jogo..."
                  : gameStateRef.current.scratchCanvases.length > 0
                    ? "Jogar Novamente (R$ 1,00)"
                    : `Iniciar Jogo (R$ ${GAME_PRICE.toFixed(2)})`}
              </Button>
            )}

            {!canPlay && (
              <p className="text-red-400 text-sm text-center">
                Saldo insuficiente. Você precisa de pelo menos R$ {GAME_PRICE.toFixed(2)} para jogar.
              </p>
            )}
          </div>

          {/* How to play */}
          <div className="mt-8 bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-red-400 font-bold mb-3">Como Jogar:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-300">
              <div className="text-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2 text-xs">
                  1
                </div>
                <p>Raspe as 9 células</p>
              </div>
              <div className="text-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2 text-xs">
                  2
                </div>
                <p>Encontre 3 símbolos iguais</p>
              </div>
              <div className="text-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2 text-xs">
                  3
                </div>
                <p>Ganhe o prêmio!</p>
              </div>
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-gray-500 py-4">
        <p className="text-sm">Copyright &copy; {new Date().getFullYear()} - Todos os direitos reservados.</p>
      </footer>

      {/* Win/Lose Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="bg-gray-800 border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-center mb-4 text-red-400">{modalTitle}</h2>
            <p className="text-gray-300 text-center mb-6">{modalMessage}</p>
            <p
              className={`text-2xl font-extrabold text-center mb-4 ${
                modalType === "win" ? "text-red-400" : "text-gray-400"
              }`}
            >
              {modalTitle}
            </p>
            <Button
              onClick={() => setShowModal(false)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold"
            >
              Fechar
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
