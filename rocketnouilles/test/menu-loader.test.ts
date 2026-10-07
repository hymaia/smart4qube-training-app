import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MenuError, findItem, loadMenu, parseMenu } from "../server/src/menu/loader";
import { FIXTURE_MENU_PATH } from "./helpers";

const fixture = () => JSON.parse(readFileSync(FIXTURE_MENU_PATH, "utf8"));

describe("menu loader", () => {
  it("loads and validates the fixture menu", async () => {
    const menu = await loadMenu(FIXTURE_MENU_PATH);
    expect(menu.restaurant.name).toBe("Test Nouilles");
    expect(menu.categories.map((c) => c.id)).toEqual(["entrees", "soupes", "boissons"]);
  });

  it("accepts null photos, null descriptions and missing Chinese names", async () => {
    const menu = await loadMenu(FIXTURE_MENU_PATH);
    const nems = findItem(menu, "nems-porc")!;
    expect(nems.photo).toBeNull();
    expect(nems.description).toBe("");
    expect(nems.nameZh).toBeUndefined();
    expect(findItem(menu, "raviolis-grilles")?.nameZh).toBe("锅贴");
  });

  it("keeps spice options and estimated prices", async () => {
    const menu = await loadMenu(FIXTURE_MENU_PATH);
    expect(findItem(menu, "lamen-boeuf")?.options?.[0].choices).toEqual(["mild", "medium", "hot"]);
    expect(findItem(menu, "the-jasmin")?.priceEstimated).toBe(true);
  });

  it("rejects an item without a price", () => {
    const raw = fixture();
    delete raw.categories[0].items[0].priceCents;
    expect(() => parseMenu(raw)).toThrow(MenuError);
    expect(() => parseMenu(raw)).toThrow(/categories\.0\.items\.0\.priceCents/);
  });

  it("rejects prices that are not integer cents", () => {
    const raw = fixture();
    raw.categories[0].items[0].priceCents = 6.6;
    expect(() => parseMenu(raw)).toThrow(MenuError);
  });

  it("rejects duplicate item ids", () => {
    const raw = fixture();
    raw.categories[1].items[0].id = "nems-porc";
    expect(() => parseMenu(raw)).toThrow(/duplicate item id "nems-porc"/);
  });

  it("reports a missing file clearly", async () => {
    await expect(loadMenu("/nope/menu.json")).rejects.toThrow(/not found/);
  });

  const realMenu = resolve(import.meta.dirname, "../public/menu/menu.json");
  it.runIf(existsSync(realMenu))("loads the real Happy Nouilles menu", async () => {
    const menu = await loadMenu(realMenu);
    expect(menu.restaurant.name).toBe("Happy Nouilles");
    expect(menu.categories.flatMap((c) => c.items).length).toBeGreaterThan(50);
  });
});
