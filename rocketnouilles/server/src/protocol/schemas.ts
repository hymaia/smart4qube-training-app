import { z } from "zod";

/** Validation of messages received from other peers. Never trust the network. */

const LineSchema = z.object({
  lineId: z.string(),
  itemId: z.string(),
  name: z.string(),
  unitPriceCents: z.number(),
  quantity: z.number().int().positive(),
  options: z.record(z.string(), z.string()),
});

const DiscountSchema = z.object({ code: z.string(), label: z.string(), amountCents: z.number() });

export const OrderSchema = z.object({
  orderId: z.string(),
  table: z.string(),
  participant: z.string().min(1),
  nodeUrl: z.string(),
  version: z.number().int().nonnegative(),
  status: z.enum(["DRAFT", "PAID", "CONFIRMED"]),
  lines: z.array(LineSchema),
  promoCodes: z.array(z.string()),
  pricing: z.object({
    subtotalCents: z.number(),
    discounts: z.array(DiscountSchema),
    discountCents: z.number(),
    totalCents: z.number(),
    rejectedCodes: z.array(z.object({ code: z.string(), reason: z.string() })),
  }),
  payment: z
    .object({
      chargeId: z.string(),
      type: z.enum(["charge", "payout"]),
      amountCents: z.number(),
      cardLast4: z.string(),
      paidAt: z.string(),
    })
    .nullable(),
  updatedAt: z.string(),
});

const FromSchema = z.object({ name: z.string().min(1), url: z.string().url() });

export const ClosureSchema = z.object({ closedAt: z.string(), closedBy: z.string() });

export const PushOrdersSchema = z.object({
  table: z.string(),
  from: FromSchema,
  orders: z.array(OrderSchema),
});

export const CloseMessageSchema = z.object({
  table: z.string(),
  from: FromSchema,
  closure: ClosureSchema,
  orders: z.array(OrderSchema),
});

export const SnapshotSchema = z.object({
  table: z.string(),
  from: FromSchema,
  orders: z.array(OrderSchema),
  closure: ClosureSchema.nullable(),
});
