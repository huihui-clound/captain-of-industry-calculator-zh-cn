/*
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe)
Please don't remove this comment if you use unmodified file
*/

import type {GameItem, GameRecipe, GameRecipeIO} from '#types/game-data';
import {GameRecipeIOFlags} from '#types/constants';
import type {GameData} from '@/scripts/data';

// A single row in the recipe list view.
// Each row = one recipe + the device that produces it.
export interface RecipeListRow {
    // stable id for v-for key
    id: string;
    // the device/factory that owns this recipe
    device: GameItem;
    // the recipe itself
    recipe: GameRecipe;
    // recipe display name (longName or name)
    label: string;
    // recipe time (seconds per cycle)
    time: number;
    // input IOs (ingredients)
    inputs: GameRecipeIO[];
    // output IOs (products)
    outputs: GameRecipeIO[];
}

// Item classification derived from recipe graph:
// - RawResource: only appears as recipe input (never produced)
// - Intermediate: produced by some recipe AND consumed by some recipe
// - FinalProduct: produced by some recipe but never consumed
export type ItemCategory = 'raw' | 'intermediate' | 'final';

export interface ItemCategoryInfo {
    category: ItemCategory;
    label: string;
}

/**
 * Build a flat list of all recipes across all devices in the game.
 * Each entry pairs a recipe with its owning device (factory item).
 */
export function buildRecipeList(gameData: GameData): RecipeListRow[] {
    const rows: RecipeListRow[] = [];
    for(const device of gameData.gameFactoriesArray) {
        const dict = gameData.getItemRecipeDictionary(device);
        for(const recipe of dict.recipes) {
            const label = recipe.longName || recipe.name;
            rows.push({
                id: `${device.name}::${recipe.name}`,
                device,
                recipe,
                label,
                time: recipe.time,
                inputs: filterShownRecipeIo(recipe.input || []),
                outputs: filterShownRecipeIo(recipe.output || []),
            });
        }
    }
    return rows;
}

// 过滤掉带 HideInMenu 标记的 IO（工人/电力/维护等非实体输入），与其他菜单保持一致
function filterShownRecipeIo(io: GameRecipeIO[]) {
    return io.filter((i) => !(i.flags & GameRecipeIOFlags.HideInMenu));
}

/**
 * Classify every item in the game into raw / intermediate / final.
 *
 * An item is:
 * - "final" if it appears in some recipe's output but never in any input
 * - "raw"   if it appears in some recipe's input but never in any output
 * - "intermediate" if it appears in both (produced and consumed)
 *
 * Items that don't appear in any recipe are ignored.
 */
export function classifyItems(gameData: GameData): Map<string, ItemCategoryInfo> {
    const produced = new Set<string>();
    const consumed = new Set<string>();

    for(const device of gameData.gameFactoriesArray) {
        const dict = gameData.getItemRecipeDictionary(device);
        for(const recipe of dict.recipes) {
            for(const io of (recipe.input || [])) {
                consumed.add(io.product.name);
            }
            for(const io of (recipe.output || [])) {
                produced.add(io.product.name);
            }
        }
    }

    const map = new Map<string, ItemCategoryInfo>();
    const allItems = new Set([...produced, ...consumed]);
    for(const name of allItems) {
        const isProduced = produced.has(name);
        const isConsumed = consumed.has(name);
        let category: ItemCategory;
        if(isProduced && isConsumed) {
            category = 'intermediate';
        } else if(isProduced) {
            category = 'final';
        } else {
            category = 'raw';
        }
        map.set(name, {
            category,
            label: category === 'raw' ? '原料'
                : category === 'intermediate' ? '中间产物'
                : '最终产物',
        });
    }
    return map;
}

/**
 * Filter recipe rows by a search query.
 *
 * When the query matches an item name, the function returns all recipes where
 * that item appears as an input (intermediate/raw) OR as an output (product).
 * This means searching "iron_ingot" will show:
 * - recipes that produce iron_ingot (it's an output)
 * - recipes that consume iron_ingot (it's an input)
 *
 * The query is split into space-separated tokens; all tokens must match
 * (across input and output items) for a recipe to be included.
 */
export function filterRecipes(rows: RecipeListRow[], query: string): RecipeListRow[] {
    const val = query.trim();
    if(!val) return rows;

    const tokens = val.toLowerCase().split(/\s+/).map((s) => s.trim()).filter(Boolean);
    if(!tokens.length) return rows;

    return rows.filter((row) => {
        return tokens.every((token) => {
            const inInput = row.inputs.some((io) =>
                io.product.lowerLabel.indexOf(token) > -1
                || io.product.name.toLowerCase().indexOf(token) > -1
                || (io.product.label || '').toLowerCase().indexOf(token) > -1
            );
            const inOutput = row.outputs.some((io) =>
                io.product.lowerLabel.indexOf(token) > -1
                || io.product.name.toLowerCase().indexOf(token) > -1
                || (io.product.label || '').toLowerCase().indexOf(token) > -1
            );
            // also match device name/label
            const inDevice = row.device.lowerLabel.indexOf(token) > -1
                || row.device.name.toLowerCase().indexOf(token) > -1
                || (row.device.label || '').toLowerCase().indexOf(token) > -1;
            return inInput || inOutput || inDevice;
        });
    });
}
