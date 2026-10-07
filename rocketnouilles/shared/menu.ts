import { z } from "zod";

export const MenuOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  choices: z.array(z.string().min(1)).min(1),
});

export const MenuItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameZh: z.string().nullish(),
  description: z.string().nullish().transform((value) => value ?? ""),
  priceCents: z.number().int().nonnegative(),
  photo: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  options: z.array(MenuOptionSchema).optional(),
  priceEstimated: z.boolean().optional(),
});

export const MenuCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  items: z.array(MenuItemSchema),
});

export const MenuSchema = z.object({
  restaurant: z.object({
    name: z.string().min(1),
    address: z.string(),
    phone: z.string().nullish(),
    website: z.string().nullish(),
    sources: z.array(z.string()).default([]),
    retrievedAt: z.string().nullish(),
    photo: z.string().nullish(),
  }),
  currency: z.literal("EUR"),
  categories: z.array(MenuCategorySchema).min(1),
  notes: z.string().nullish(),
  allergensDisclaimer: z.string().nullish(),
});

export type MenuOption = z.infer<typeof MenuOptionSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type Menu = z.infer<typeof MenuSchema>;
