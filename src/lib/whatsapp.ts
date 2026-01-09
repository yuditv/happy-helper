import { Client, PlanType, formatCurrency, planPrices } from '@/types/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppMessageParams {
  client: Client;
  planName: string;
  daysRemaining: number;
  template?: string;
  planPrice?: number;
}

export function replaceTemplateVariables(
  template: string,
  clientName: string,
  planName: string,
  daysRemaining: number,
  expiresAt: Date,
  planPrice?: number
): string {
  return template
    .replace(/\{nome\}/g, clientName)
    .replace(/\{plano\}/g, planName)
    .replace(/\{dias\}/g, Math.abs(daysRemaining).toString())
    .replace(/\{data_vencimento\}/g, format(expiresAt, "dd/MM/yyyy", { locale: ptBR }))
    .replace(/\{valor\}/g, formatCurrency(planPrice || 0));
}

export function generateExpirationMessage({ client, planName, daysRemaining, template, planPrice }: WhatsAppMessageParams): string {
  // If a custom template is provided, use it
  if (template) {
    return replaceTemplateVariables(
      template,
      client.name,
      planName,
      daysRemaining,
      client.expiresAt,
      planPrice || client.price || planPrices[client.plan]
    );
  }

  // Default messages
  if (daysRemaining < 0) {
    return `Olá ${client.name}! 👋

Seu plano *${planName}* venceu há ${Math.abs(daysRemaining)} dia(s).

Para continuar utilizando nossos serviços, renove sua assinatura o quanto antes!

Caso tenha alguma dúvida, estamos à disposição. 😊`;
  }

  if (daysRemaining === 0) {
    return `Olá ${client.name}! 👋

Seu plano *${planName}* vence *hoje*!

Renove agora para não perder o acesso aos nossos serviços.

Qualquer dúvida, estamos aqui para ajudar! 😊`;
  }

  return `Olá ${client.name}! 👋

Seu plano *${planName}* vence em *${daysRemaining} dia(s)*.

Aproveite para renovar com antecedência e garantir a continuidade dos serviços!

Qualquer dúvida, estamos à disposição. 😊`;
}

export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters
  const numbersOnly = phone.replace(/\D/g, '');
  
  // If it doesn't start with country code, add Brazil's code
  if (numbersOnly.length <= 11) {
    return `55${numbersOnly}`;
  }
  
  return numbersOnly;
}

export function openWhatsApp(phone: string, message: string): void {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}
