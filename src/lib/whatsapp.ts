// WhatsApp utility functions - placeholder for new implementation

export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
}

export function generateExpirationMessage({
  client,
  planName,
  daysRemaining,
  template,
  planPrice,
}: {
  client: { name: string; expiresAt: Date };
  planName: string;
  daysRemaining: number;
  template?: string;
  planPrice?: number;
}): string {
  const expirationDate = client.expiresAt.toLocaleDateString('pt-BR');
  
  if (template) {
    return template
      .replace(/\{nome\}/g, client.name)
      .replace(/\{plano\}/g, planName)
      .replace(/\{dias\}/g, String(Math.abs(daysRemaining)))
      .replace(/\{vencimento\}/g, expirationDate)
      .replace(/\{preco\}/g, planPrice ? `R$ ${planPrice.toFixed(2)}` : '');
  }

  if (daysRemaining < 0) {
    return `Olá ${client.name}! ⚠️\n\nSeu plano ${planName} venceu há ${Math.abs(daysRemaining)} dia(s).\n\nRenove agora para continuar aproveitando nossos serviços! 🚀`;
  }

  if (daysRemaining === 0) {
    return `Olá ${client.name}! 🔔\n\nSeu plano ${planName} vence HOJE!\n\nNão deixe de renovar para não perder o acesso. 😊`;
  }

  return `Olá ${client.name}! 👋\n\nSeu plano ${planName} vence em ${daysRemaining} dia(s) (${expirationDate}).\n\nRenove com antecedência para garantir a continuidade! 💪`;
}
