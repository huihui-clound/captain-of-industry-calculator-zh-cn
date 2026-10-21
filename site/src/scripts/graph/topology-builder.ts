/*
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe)
Please don't remove this comment if you use unmodified file
*/

import type {BlueprintItemModel, BlueprintModel, LinkModel} from '../model/store';
import {formatIo} from '../format';

// A single factory node in the topology overview.
export interface TopologyNode {
    // stable id (re-used as dagre node id and as svg group key)
    id: string;
    // factory item key from the blueprint (for cross-reference / hover)
    itemKey: string;
    // factory item label, e.g. "Iron Ore Mine"
    label: string;
    // sprite image key for icon rendering (matches icon-component :image)
    image: string;
    // resolved factory count (may be undefined if not solved yet)
    count: number | undefined;
    // solved count (may be undefined if not solved yet)
    solvedCount: number | undefined;
    // x/y are filled by the layout step (in topology-layout.ts)
    x: number;
    y: number;
    // width/height are fixed for layouting purposes
    width: number;
    height: number;
}

// An edge between two factory nodes. Represents a single product flow.
export interface TopologyEdge {
    id: string;
    sourceId: string;
    targetId: string;
    // product name (e.g. "iron_ore")
    productName: string;
    // product label (e.g. "Iron Ore")
    productLabel: string;
    // product sprite image key
    productImage: string;
    // formatted rate string, e.g. "12.5/s"
    rateLabel: string;
    // raw numeric rate, useful for stroke width scaling
    rate: number | undefined;
    // optional reference back to the original link (for diagnostics)
    linkKey: string;
}

export interface TopologyGraph {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    // bounding box computed from layout (filled later)
    width: number;
    height: number;
}

// Fixed node dimensions for the topology overview (consistent layout regardless
// of the actual factory card size on the main canvas).
const NODE_WIDTH = 180;
const NODE_HEIGHT = 64;

/**
 * Build a self-contained topology graph (nodes + edges) from a blueprint model.
 * The returned object is a plain snapshot — it does NOT mutate the blueprint,
 * so it is safe to use inside a transient dialog without affecting the main
 * canvas layout.
 */
export function buildTopologyGraph(blueprintModel: BlueprintModel): TopologyGraph {
    const items = [...blueprintModel.items];
    const nodes: TopologyNode[] = items.map((item: BlueprintItemModel) => ({
        id: item.key,
        itemKey: item.key,
        label: item.label || item.name || '',
        image: item.image || '',
        count: item.count,
        solvedCount: item.solvedCount,
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
    }));

    const edges: TopologyEdge[] = [];
    const seenEdgeKeys = new Set<string>();
    for(const link of blueprintModel.links) {
        const linkModel = link as LinkModel;
        const outputIo = linkModel.output;
        const inputIo = linkModel.input;
        const sourceItem = outputIo?.ownerItem;
        const targetItem = inputIo?.ownerItem;
        if(!sourceItem || !targetItem || sourceItem.key === targetItem.key)
            continue;

        // dedupe parallel edges between the same pair for the same product
        // (multiple links of the same product between two factories are merged
        // into one edge, with summed rate)
        const productName = inputIo?.name || outputIo?.name || '';
        const edgeKey = `${sourceItem.key}->${targetItem.key}::${productName}`;
        const rate = inputIo?.cpsSolvedTotal ?? outputIo?.cpsSolvedTotal;
        const rateLabel = inputIo
            ? formatIo(inputIo.cpsSolvedTotal, inputIo)
            : (outputIo ? formatIo(outputIo.cpsSolvedTotal, outputIo) : '');

        const existing = seenEdgeKeys.has(edgeKey);
        if(existing) {
            const existingEdge = edges.find((e) => e.id === edgeKey);
            if(existingEdge && rate !== undefined) {
                const prev = existingEdge.rate ?? 0;
                existingEdge.rate = prev + rate;
                // re-format using input io's formatter if available
                if(inputIo) {
                    existingEdge.rateLabel = formatIo(existingEdge.rate, inputIo);
                }
            }
            continue;
        }
        seenEdgeKeys.add(edgeKey);

        edges.push({
            id: edgeKey,
            sourceId: sourceItem.key,
            targetId: targetItem.key,
            productName,
            productLabel: inputIo?.label || outputIo?.label || productName,
            productImage: inputIo?.image || outputIo?.image || '',
            rateLabel,
            rate,
            linkKey: linkModel.key,
        });
    }

    return {
        nodes,
        edges,
        width: 0,
        height: 0,
    };
}
