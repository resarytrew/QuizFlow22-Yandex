import { z } from "zod";
export const WorkspaceInput = z.object({
  user_id: z.uuid().optional(),
  payment_id: z.uuid().optional(),
  ticket_id: z.uuid().optional(),
  body: z.string().trim().min(1).max(10000).optional(),
  days: z.number().int().min(1).max(365).optional(),
  idempotency_key: z.uuid().optional(),
});
const row = z.record(z.string(), z.unknown());
export const WorkspaceSchema = z.object({
  account: z
    .object({
      id: z.uuid(),
      email: z.string(),
      missing_profile: z.boolean(),
      created_at: z.iso.datetime({ offset: true }),
    })
    .passthrough(),
  access: z
    .object({
      plan: z.enum(["free", "pro"]),
      source: z.string(),
      valid_until: z.iso.datetime({ offset: true }).nullable(),
    })
    .passthrough()
    .nullable(),
  payments: z.array(
    z
      .object({
        id: z.uuid(),
        amount_kopecks: z.number().int().nonnegative(),
        currency: z.string(),
        status: z.string(),
        created_at: z.iso.datetime({ offset: true }),
      })
      .passthrough(),
  ),
  subscriptions: z.array(row),
  grants: z.array(row),
  tickets: z.array(row),
  events: z.array(row),
  notes: z.array(row),
  promos: z.array(row),
  messages: z.array(row),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;
export const AttentionSchema = z.object({
  items: z.array(
    z.object({
      kind: z.string(),
      id: z.string(),
      user_id: z.string().nullable(),
      label: z.string(),
      created_at: z.string(),
    }),
  ),
});
