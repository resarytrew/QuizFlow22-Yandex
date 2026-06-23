import { api } from './apiClient';
import type {
  SupportTicketCategory,
  SupportTicketMessage,
  UserSupportTicket,
} from '../types';

export async function listMySupportTickets(): Promise<UserSupportTicket[]> {
  return api.listSupportTickets();
}

export async function listSupportMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  return api.listSupportMessages(ticketId);
}

export async function createSupportTicket(input: {
  userId: string;
  email: string | null;
  subject: string;
  category: SupportTicketCategory;
  message: string;
}): Promise<UserSupportTicket> {
  return api.createSupportTicket({
    email: input.email,
    subject: input.subject,
    category: input.category,
    message: input.message,
  });
}

export async function sendSupportMessage(
  ticketId: string,
  userId: string,
  body: string,
): Promise<SupportTicketMessage> {
  return api.sendSupportMessage(ticketId, body);
}
