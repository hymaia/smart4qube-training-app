---
title: Menu and allergens guide
owner: Ordering squad (menu data)
updated: 2026-10-07
status: current
audience: everyone
source: public/menu/menu.json in the rocketnouilles repository
---

# Menu and allergens guide

> **Disclaimer.** Allergens are inferred from dish descriptions for training purposes only. Always confirm with
> the restaurant. This sentence is also printed on every group sheet.

## About the menu data

- Restaurant: Happy Nouilles, 95 Rue Beaubourg, 75003 Paris, phone +33 1 44 59 31 22.
- Source: the Happy Nouilles Uber Eats store page (PDF export supplied by the trainer), retrieved 2026-10-07.
- **Prices are Uber Eats delivery prices as of 2026-10-07; dine-in and takeaway prices may differ.** The amounts
  charged by NoodlePay are fake anyway; the real bill is settled at the restaurant.
- 76 dishes in 10 categories: Entrées (15), Fraîcheur de l'été (5), Nouilles et riz sautés (12), Soupes (14),
  Viandes (5), Poissons et fruits de mer (3), Légumes (6), Accompagnements (3), Desserts (2), Boissons (11).
- Most dishes carry their Chinese name (`nameZh`), printed next to the dish in the kitchen tally.

## Spice options

22 dishes offer a **Spice level** option with three choices: `mild`, `medium`, `hot`. They are the sautéed lamen,
tagliatelle and wheat-filament dishes, every lamen soup, and the two cold beef noodle dishes. The chosen level is printed on the
sheet next to the dish ("spice: hot"). Dishes tagged `spicy` (13 of them) are spicy by recipe whether or not they
offer the option.

## Noodle dishes

26 dishes are tagged `noodles`. This tag decides which dishes count for `HAPPYHOUR` and for the big table bonus
(8 noodle dishes or more at the table). Dumplings, rice dishes and the *Raviolis* soups without lamen are **not**
noodle dishes.

## Allergens

| Allergen | Dishes | Notes |
|---|---|---|
| peanut | 3 | Raviolis de porc à la sauce pimentée (cacahuètes), Bô bun, Poulet à l'impérial |
| shellfish | 10 | every shrimp and gambas dish: Crevettes croustillantes, Raviolis de crevettes (4 pièces), Nouilles froides aux crevettes croustillantes, Lamen sauté aux crevettes, Raviolis de crevettes aux lamens, Raviolis aux crevettes (8 pièces, soup), Crevettes aux lamens, Crevettes croustillantes aux lamens, Gambas sel et poivre, Crevettes au basilic |
| fish | 3 | Bô bun, Crevettes au basilic, Bar à la vapeur |
| sesame | 5 | Méduse au concombre, Salade de poulet, Algues, Salade au poulet croustillant, Poulet croustillant aux lamens |
| egg | 9 | Crevettes croustillantes, Salade au poulet croustillant, Lamen sauté au poulet croustillant, Riz sauté ananas au poulet croustillant, Poulet au curry rouge, Trio (poulet, frites, salade), Poulet croustillant aux lamens, Omelette aux pousses d'ail, Riz cantonais |
| gluten | 42 | all noodle, dumpling and fried dishes |
| soy | 56 | most dishes (soy sauce), and the soy drink |

13 items list **no allergen**: Riz parfumé, the two desserts (Perles de coco, Lychée au sirop) and ten of the
eleven drinks (the soy drink contains soy).

## Vegetarian dishes

13 dishes are tagged `vegetarian` (for example Algues, Lamen sauté aux légumes, Légumes variés aux lamens,
Raviolis pékinois végétarien, Aubergine parfumée, Riz parfumé, Lamen nature). The tag is inferred from the
description; check with the restaurant for strict diets.

## How allergens reach the restaurant

The group sheet has an **Allergens** section that lists, for each allergen, the participants whose dishes contain
it, followed by the disclaimer. RocketNouilles has no free-text note field: a participant with a severe allergy
tells the person who hands the sheet over, and that person confirms with the restaurant staff (see the
ordering-day procedure).
