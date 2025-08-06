export function formatWebhookStatus(status: string): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  switch (status) {
    case "success":
      return { label: "Sucesso", variant: "default" }
    case "pending":
      return { label: "Pendente", variant: "secondary" }
    case "failed":
      return { label: "Falhou", variant: "destructive" }
    case "refunded":
      return { label: "Estornado", variant: "outline" }
    default:
      return { label: status, variant: "outline" }
  }
}

export function getWebhookTypeIcon(type: "deposit" | "withdraw"): string {
  return type === "deposit" ? "💰" : "💸"
}
