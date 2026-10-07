import { readFile } from "node:fs/promises";
import { MenuSchema, type Menu, type MenuItem } from "../../../shared/menu";

export class MenuError extends Error {}

/** Parses and validates a menu document (see public/menu/menu.json). */
export function parseMenu(raw: unknown): Menu {
  const result = MenuSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new MenuError(`Invalid menu:\n  ${issues.join("\n  ")}`);
  }
  const ids = result.data.categories.flatMap((c) => c.items.map((i) => i.id));
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) throw new MenuError(`Invalid menu: duplicate item id "${duplicate}"`);
  return result.data;
}

export async function loadMenu(path: string): Promise<Menu> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    throw new MenuError(`Menu file not found at ${path}`);
  }
  try {
    return parseMenu(JSON.parse(text));
  } catch (error) {
    if (error instanceof MenuError) throw error;
    throw new MenuError(`Menu file ${path} is not valid JSON`);
  }
}

export function findItem(menu: Menu, itemId: string): MenuItem | undefined {
  for (const category of menu.categories) {
    const item = category.items.find((i) => i.id === itemId);
    if (item) return item;
  }
  return undefined;
}
