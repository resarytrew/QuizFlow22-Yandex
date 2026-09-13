import { z } from "zod";
export const GrantProSchema = z.object({
  user_id: z.uuid(),
  plan: z.enum(["pro_monthly", "pro_yearly"]).optional(),
  days: z.number().int().min(1).max(365).optional(),
  reason: z.string().max(500).nullable().optional(),
  idempotency_key: z.string().min(8).max(128).optional(),
});

export const ModerationSchema = z.object({
  quiz_id: z.uuid(),
  moderation_status: z.enum([
    "unreviewed",
    "reviewing",
    "approved",
    "rejected",
    "blocked",
    "hidden",
    "deleted",
  ]),
  reason: z.string().max(2000).nullable().optional(),
  moderation_reason: z.string().max(2000).nullable().optional(),
});
export const UserStatusSchema = z.object({
  user_id: z.uuid(),
  status: z.enum(["active", "temporarily_blocked", "blocked"]),
  blocked_until: z.iso.datetime().nullable().optional(),
  reason: z.string().max(2000).nullable().optional(),
});
export const SupportStatusSchema = z.object({
  ticket_id: z.uuid(),
  status: z.enum(["new", "in_progress", "waiting_user", "closed"]),
  internal_note: z.string().max(10000).nullable().optional(),
  resolution: z.string().max(10000).nullable().optional(),
});
export const ReportStatusSchema = z.object({
  report_id: z.uuid(),
  status: z.enum(["new", "reviewing", "approved", "rejected", "closed"]),
  resolution: z.string().max(10000).nullable().optional(),
});
const profile = z.object({
  account_code: z.coerce.number().nullable(),
  display_name: z.string().nullable(),
  username: z.string().nullable(),
});
const date = z.string();
export const QuizSchema = z.object({
  id: z.uuid(),
  owner_user_id: z.uuid(),
  owner_account_code: z.coerce.number().nullable(),
  owner_display_name: z.string().nullable(),
  owner_username: z.string().nullable(),
  owner_status: z.string().nullable(),
  name: z.string(),
  visibility: z.enum(["private", "unlisted", "public"]),
  display_code: z.string().nullable(),
  raw_display_code: z.coerce.number().nullable(),
  moderation_status: ModerationSchema.shape.moderation_status,
  moderation_reason: z.string().nullable(),
  moderated_at: date.nullable(),
  deleted_at: date.nullable(),
  is_published: z.boolean(),
  published_at: date.nullable(),
  created_at: date,
  updated_at: date,
});
export const MessageSchema = z.object({
  id: z.uuid(),
  ticket_id: z.uuid(),
  sender_user_id: z.string().nullable(),
  sender_kind: z
    .enum(["user", "admin", "staff", "system"])
    .transform((value) => (value === "admin" ? ("staff" as const) : value)),
  body: z.string(),
  attachment_name: z.string().nullable().default(null),
  attachment_url: z.string().nullable().default(null),
  created_at: date,
});
export const TicketSchema = z.object({
  id: z.uuid(),
  user_id: z.string().nullable(),
  email: z.string().nullable(),
  subject: z.string(),
  category: z.string(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  status: SupportStatusSchema.shape.status,
  message: z.string(),
  assigned_to: z.string().nullable(),
  internal_note: z.string().nullable(),
  resolution: z.string().nullable(),
  closed_at: date.nullable(),
  created_at: date,
  updated_at: date,
  user: profile,
  assignee: profile,
  messages: z.array(MessageSchema),
});
export const ReportSchema = z.object({
  id: z.uuid(),
  quiz_id: z.uuid(),
  reporter_user_id: z.string().nullable(),
  reason: z.string(),
  comment: z.string().nullable(),
  status: ReportStatusSchema.shape.status,
  assigned_to: z.string().nullable(),
  resolution: z.string().nullable(),
  resolved_at: date.nullable(),
  created_at: date,
  updated_at: date,
  quiz_name: z.string().nullable(),
  quiz_display_code: z.string().nullable(),
  quiz_owner: profile,
  reporter: profile,
  assignee: profile,
});
export const UserSchema = z.object({
  id: z.uuid(),
  account_code: z.coerce.number(),
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  status: UserStatusSchema.shape.status,
  blocked_until: date.nullable(),
  created_at: date,
  updated_at: date,
  last_active_at: date.nullable(),
  quiz_count: z.coerce.number(),
});
export type SupportStatusInput = z.infer<typeof SupportStatusSchema>;
export type ReportStatusInput = z.infer<typeof ReportStatusSchema>;
export type AdminTicket = z.infer<typeof TicketSchema>;
export type AdminReport = z.infer<typeof ReportSchema>;
export type AdminQuiz = z.infer<typeof QuizSchema>;
export const MutationSchemas: Readonly<Record<string, z.ZodType>> = {
  "user-status": UserStatusSchema,
  "quiz-moderation": ModerationSchema,
  "moderate-quiz": ModerationSchema,
  "support-status": SupportStatusSchema,
  "support/update-status": SupportStatusSchema,
  "report-status": ReportStatusSchema,
  "reports/update": ReportStatusSchema,
  "grant-pro": GrantProSchema,
  "support-reply": z
    .object({
      ticket_id: z.uuid(),
      body: z.string().trim().min(1).max(10000).optional(),
      message: z.string().trim().min(1).max(10000).optional(),
    })
    .refine((x) => Boolean(x.body || x.message)),
  "promocode-create": z.object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{4,20}$/),
    plan_id: z.enum(["pro_monthly", "pro_yearly"]),
    valid_until: z.iso.datetime().nullable().optional(),
    max_uses: z.number().int().positive().nullable().optional(),
  }),
  "promocode-toggle": z.object({
    code: z.string().min(1),
    is_active: z.boolean(),
  }),
  "update-user": z.object({
    user_id: z.uuid(),
    role: z.enum(["user", "admin"]),
  }),
  "block-user": z.object({
    user_id: z.uuid(),
    blocked: z.boolean(),
    duration_hours: z.number().positive().max(8760).optional(),
    reason: z.string().max(2000).optional(),
  }),
};
export function validateAdminEntity(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const schemas: Record<string, z.ZodType> = {
    quiz: QuizSchema,
    ticket: TicketSchema,
    report: ReportSchema,
    user: UserSchema,
  };
  for (const [key, schema] of Object.entries(schemas))
    if (key in data) data[key] = schema.parse(data[key]);
  const lists: Record<string, z.ZodType> = {
    quizzes: QuizSchema,
    tickets: TicketSchema,
    reports: ReportSchema,
    users: UserSchema,
  };
  for (const [key, schema] of Object.entries(lists))
    if (Array.isArray(data[key])) data[key] = z.array(schema).parse(data[key]);
  if ("message" in data && typeof data.message === "object")
    data.message = MessageSchema.parse(data.message);
  return data;
}
