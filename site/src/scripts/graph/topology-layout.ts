/*
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe)
Please don't remove this comment if you use unmodified file
*/

import type {GraphLabel} from 'dagre';
import type {TopologyGraph, TopologyNode} from './topology-builder';

export interface TopologyLayoutOptions {
    // LR (left-to-right) by default, matches the user's chosen flow direction
    rankdir?: 'LR' | 'TB' | 'BT' | 'RL';
    // spacing between nodes in the same rank
    nodeSpacing?: number;
    // spacing between ranks (connected nodes)
    rankSpacing?: number;
    // spacing between parallel edges
    edgeSpacing?: number;
}

const DEFAULT_OPTIONS: Required<TopologyLayoutOptions> = {
    rankdir: 'LR',
    nodeSpacing: 40,
    rankSpacing: 80,
    edgeSpacing: 12,
};

/**
 * Run a dagre layout pass on a topology graph in place.
 *
 * Unlike `autoLayoutGraphDagre` (which mutates the real blueprint), this
 * function operates purely on the snapshot returned by `buildTopologyGraph`
 * — it does not touch the live blueprint model, so it is safe to call from a
 * transient dialog without affecting the main canvas.
 */
export async function layoutTopologyGraph(
    graph: TopologyGraph,
    options?: TopologyLayoutOptions,
): Promise<TopologyGraph> {
    const opts = {...DEFAULT_OPTIONS, ...options};
    const dagre = (await import('dagre')).default;

    const dagreLayoutOptions: GraphLabel = {
        rankdir: opts.rankdir,
        nodesep: opts.nodeSpacing,
        ranksep: opts.rankSpacing,
        edgesep: opts.edgeSpacing,
        // margin around the whole graph
        marginx: 24,
        marginy: 24,
    };

    // multigraph: true 允许同一对节点之间存在多条命名边
    // （两个工厂之间有多种产物流动时需要）
    const g = new dagre.graphlib.Graph({multigraph: true, compound: false});
    g.setGraph(dagreLayoutOptions);
    g.setDefaultEdgeLabel(() => ({}));

    for(const node of graph.nodes) {
        g.setNode(node.id, {
            width: node.width,
            height: node.height,
        });
    }
    for(const edge of graph.edges) {
        // dagre requires unique edge names when there are parallel edges
        // (multiple products between the same pair of factories). The id is
        // unique per (source, target, product) so it is safe to use directly.
        g.setEdge(edge.sourceId, edge.targetId, {}, edge.id);
    }

    dagre.layout(g);

    // write positions back onto the topology nodes (in place)
    let maxX = 0;
    let maxY = 0;
    const nodeById = new Map<string, TopologyNode>(graph.nodes.map((n) => [n.id, n]));
    for(const nodeId of g.nodes()) {
        const dagreNode = g.node(nodeId);
        const node = nodeById.get(nodeId);
        if(!dagreNode || !node)
            continue;
        // dagre returns the center point of each node; convert to top-left
        node.x = dagreNode.x - dagreNode.width / 2;
        node.y = dagreNode.y - dagreNode.height / 2;
        const right = node.x + dagreNode.width;
        const bottom = node.y + dagreNode.height;
        if(right > maxX) maxX = right;
        if(bottom > maxY) maxY = bottom;
    }

    graph.width = maxX;
    graph.height = maxY;
    return graph;
}
