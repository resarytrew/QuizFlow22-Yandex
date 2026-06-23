import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

export async function handler(event: any) {
  const { httpMethod, headers, body, pathParameters } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  try {
    const user = await verifyAuth(headers.authorization);
    if (!user) return unauthorized();
    await ensureUser(user.id, user.email);

    const ticketId = pathParameters?.ticketId;

    if (httpMethod === 'GET' && !ticketId) return await listTickets(user.id);
    if (httpMethod === 'POST' && !ticketId) return await createTicket(user.id, user.email, body);
    if (httpMethod === 'GET' && ticketId) {
      return await listMessages(user.id, ticketId);
    }
    if (httpMethod === 'POST' && ticketId) {
      return await sendMessage(user.id, ticketId, body);
    }

    return notFound();
  } catch (error) {
    console.error('Support error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function listTickets(userId: string) {
  const rows = await query(
    `SELECT id, subject, category, priority,
            CASE WHEN status = 'open' THEN 'new' ELSE status END as status,
            message, resolution, created_at, updated_at, closed_at
     FROM public.support_tickets
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId],
  );
  return ok(rows);
}

async function createTicket(userId: string, email: string, body: string) {
  const input = JSON.parse(body || '{}');
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();
  const category = String(input.category || 'general');
  if (subject.length < 4 || message.length < 10) return badRequest('invalid_ticket');

  const [ticket] = await query(
    `INSERT INTO public.support_tickets (user_id, email, subject, category, priority, status, message)
     VALUES ($1, $2, $3, $4, $5, 'open', $6)
     RETURNING id, subject, category, priority,
               CASE WHEN status = 'open' THEN 'new' ELSE status END as status,
               message, resolution, created_at, updated_at, closed_at`,
    [userId, input.email || email || null, subject, category, category === 'billing' ? 'high' : 'normal', message],
  );

  await query(
    `INSERT INTO public.support_ticket_messages (ticket_id, sender_id, sender_user_id, sender_kind, body, message, is_staff)
     VALUES ($1, $2, $2, 'user', $3, $3, false)`,
    [ticket.id, userId, message],
  );

  return ok(ticket, 201);
}

async function assertTicketOwner(userId: string, ticketId: string) {
  return await queryOne(
    `SELECT id FROM public.support_tickets WHERE id = $1 AND user_id = $2`,
    [ticketId, userId],
  );
}

async function listMessages(userId: string, ticketId: string) {
  const ticket = await assertTicketOwner(userId, ticketId);
  if (!ticket) return notFound();

  const rows = await query(
    `SELECT id, ticket_id, sender_user_id, sender_kind,
            COALESCE(body, message) as body,
            attachment_name, attachment_url, created_at
     FROM public.support_ticket_messages
     WHERE ticket_id = $1
     ORDER BY created_at ASC`,
    [ticketId],
  );
  return ok(rows);
}

async function sendMessage(userId: string, ticketId: string, body: string) {
  const ticket = await assertTicketOwner(userId, ticketId);
  if (!ticket) return notFound();

  const input = JSON.parse(body || '{}');
  const text = String(input.body || '').trim();
  if (!text) return badRequest('body is required');

  const [message] = await query(
    `INSERT INTO public.support_ticket_messages (ticket_id, sender_id, sender_user_id, sender_kind, body, message, is_staff)
     VALUES ($1, $2, $2, 'user', $3, $3, false)
     RETURNING id, ticket_id, sender_user_id, sender_kind, body, attachment_name, attachment_url, created_at`,
    [ticketId, userId, text],
  );

  await query(
    `UPDATE public.support_tickets
     SET status = CASE WHEN status = 'closed' THEN status ELSE 'waiting_user' END,
         updated_at = now()
     WHERE id = $1`,
    [ticketId],
  );

  return ok(message, 201);
}

function ok(data: any, status = 200) {
  return {
    statusCode: status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function unauthorized() {
  return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'Unauthorized' }) };
}

function badRequest(message: string) {
  return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

function notFound() {
  return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Not found' }) };
}
