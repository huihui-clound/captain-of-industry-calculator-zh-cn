<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import type {TopologyEdge, TopologyGraph, TopologyNode} from '@/scripts/graph/topology-builder';
import {computed, onBeforeUnmount, ref, unref, watch} from 'vue';
import {useEventListener} from '@vueuse/core';
import {mdiAlert} from '@mdi/js';
import IconComponent from '@/components/icon-component.vue';
import {layoutTopologyGraph} from '@/scripts/graph/topology-layout';

const props = defineProps<{
    // initial graph snapshot (will be re-laid-out in place on mount + whenever the key changes)
    graph: TopologyGraph;
    // bump this number to force a re-layout (e.g. when blueprint changes while dialog is open)
    refreshKey?: number;
}>();


// view transform (pan + zoom). Applied to the inner <g> group.
const scale = ref(1);
const pan = ref({x: 0, y: 0});

// hover + click highlight state
const hoveredNodeId = ref<string | undefined>();
const hoveredEdgeId = ref<string | undefined>();
const selectedNodeId = ref<string | undefined>();
// when a node is selected, also highlight its ancestors/descendants
const upstreamIds = ref<Set<string>>(new Set());
const downstreamIds = ref<Set<string>>(new Set());

// dragging state for node repositioning
const draggingNode = ref<TopologyNode | undefined>();
const dragOffset = ref({x: 0, y: 0});
// panning state (background drag = pan viewport)
const isPanning = ref(false);
const panStart = ref({x: 0, y: 0, panX: 0, panY: 0});
// 标志：本次 pointerdown 是否产生了实际移动（平移或节点拖拽）。
// 如果产生了移动，紧跟其后的 click 事件应被视为拖拽结束而非点击，
// 不应清除选中高亮。
const hasMoved = ref(false);

// track whether the inner graph has been laid out at least once
const layoutDone = ref(false);
const layoutError = ref<string | undefined>();

const svgRef = ref<SVGSVGElement | undefined>();
const contentRef = ref<SVGGElement | undefined>();

// ---------- Layout ----------
async function runLayout() {
    layoutError.value = undefined;
    try {
        await layoutTopologyGraph(props.graph, {
            rankdir: 'LR',
            nodeSpacing: 40,
            rankSpacing: 80,
            edgeSpacing: 12,
        });
        layoutDone.value = true;
        // initial fit-to-view: scale the graph to ~80% of the svg viewport
        await nextTickFit();
    } catch(err) {
        layoutError.value = (err as Error)?.message || String(err);
    }
}

const contentBounds = computed(() => {
    const g = props.graph;
    return {
        width: Math.max(g.width, 1),
        height: Math.max(g.height, 1),
    };
});

const transformStyle = computed(() => ({
    transform: `translate(${pan.value.x}px, ${pan.value.y}px) scale(${scale.value})`,
    'transform-origin': '0 0',
}));

// ---------- Helpers ----------
const nodesById = computed(() => {
    const m = new Map<string, TopologyNode>();
    for(const n of props.graph.nodes) m.set(n.id, n);
    return m;
});

const edgesByNode = computed(() => {
    // map nodeId -> { outgoing: TopologyEdge[], incoming: TopologyEdge[] }
    const m = new Map<string, {outgoing: TopologyEdge[]; incoming: TopologyEdge[]}>();
    for(const node of props.graph.nodes) {
        m.set(node.id, {outgoing: [], incoming: []});
    }
    for(const edge of props.graph.edges) {
        m.get(edge.sourceId)?.outgoing.push(edge);
        m.get(edge.targetId)?.incoming.push(edge);
    }
    return m;
});

function collectReachable(startId: string, direction: 'up' | 'down'): Set<string> {
    const result = new Set<string>();
    const stack = [startId];
    while(stack.length) {
        const id = stack.pop()!;
        if(result.has(id)) continue;
        result.add(id);
        const conns = edgesByNode.value.get(id);
        if(!conns) continue;
        const next = direction === 'up'
            ? conns.incoming.map((e) => e.sourceId)
            : conns.outgoing.map((e) => e.targetId);
        for(const n of next) {
            if(!result.has(n)) stack.push(n);
        }
    }
    // remove the start node itself from the "neighbours" set
    result.delete(startId);
    return result;
}

function isNodeHighlighted(node: TopologyNode): boolean {
    if(unref(hoveredNodeId) === node.id) return true;
    if(unref(selectedNodeId) === node.id) return true;
    if(unref(upstreamIds).has(node.id)) return true;
    if(unref(downstreamIds).has(node.id)) return true;
    return false;
}

function isEdgeHighlighted(edge: TopologyEdge): boolean {
    if(unref(hoveredEdgeId) === edge.id) return true;
    const sel = unref(selectedNodeId);
    if(sel) {
        // edge is on a path going through the selected node
        return (edge.sourceId === sel || edge.targetId === sel
            || (unref(upstreamIds).has(edge.sourceId) && (edge.targetId === sel || unref(upstreamIds).has(edge.targetId)))
            || (unref(downstreamIds).has(edge.targetId) && (edge.sourceId === sel || unref(downstreamIds).has(edge.sourceId))));
    }
    return false;
}

function isNodeFaded(node: TopologyNode): boolean {
    // when something is highlighted, fade everything else
    const anyHighlight = unref(hoveredNodeId) || unref(hoveredEdgeId) || unref(selectedNodeId);
    if(!anyHighlight) return false;
    return !isNodeHighlighted(node);
}

function isEdgeFaded(edge: TopologyEdge): boolean {
    const anyHighlight = unref(hoveredNodeId) || unref(hoveredEdgeId) || unref(selectedNodeId);
    if(!anyHighlight) return false;
    return !isEdgeHighlighted(edge);
}

// ---------- Edge path geometry ----------
// We connect from the right side of the source node to the left side of the
// target node (LR layout). Use a cubic bezier with horizontal control handles
// for a clean, modern look.
function edgePath(edge: TopologyEdge): string {
    const source = nodesById.value.get(edge.sourceId);
    const target = nodesById.value.get(edge.targetId);
    if(!source || !target) return '';
    const sx = source.x + source.width;
    const sy = source.y + source.height / 2;
    const tx = target.x;
    const ty = target.y + target.height / 2;
    const dx = Math.max(40, Math.abs(tx - sx) * 0.4);
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}

function edgeMidpoint(edge: TopologyEdge): {x: number; y: number} {
    const source = nodesById.value.get(edge.sourceId);
    const target = nodesById.value.get(edge.targetId);
    if(!source || !target) return {x: 0, y: 0};
    return {
        x: (source.x + source.width + target.x) / 2,
        y: (source.y + source.height / 2 + target.y + target.height / 2) / 2,
    };
}

function edgeStrokeWidth(edge: TopologyEdge): number {
    const rate = edge.rate;
    if(rate === undefined || rate <= 0) return 1.5;
    // log scale so 1/s and 1000/s both stay readable
    return Math.min(6, 1.5 + Math.log10(1 + rate) * 1.2);
}

// ---------- Zoom / pan ----------
function clampScale(v: number) {
    return Math.max(0.15, Math.min(v, 4));
}

function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = -event.deltaY;
    const factor = delta > 0 ? 1.1 : 1 / 1.1;
    const newScale = clampScale(unref(scale) * factor);
    // zoom around the mouse position (when possible)
    const svg = unref(svgRef);
    if(svg) {
        const rect = svg.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        // world point under the mouse before zoom
        const wx = (mx - unref(pan).x) / unref(scale);
        const wy = (my - unref(pan).y) / unref(scale);
        scale.value = newScale;
        // adjust pan so the same world point stays under the mouse
        pan.value = {
            x: mx - wx * newScale,
            y: my - wy * newScale,
        };
    } else {
        scale.value = newScale;
    }
}

function startPan(event: PointerEvent) {
    // only start panning when clicking on empty svg background (not on a node/edge)
    if(event.target !== unref(svgRef) && event.target !== unref(contentRef))
        return;
    isPanning.value = true;
    hasMoved.value = false;
    panStart.value = {
        x: event.clientX,
        y: event.clientY,
        panX: unref(pan).x,
        panY: unref(pan).y,
    };
    // disable text selection while panning (consistent with main canvas drag fix)
    document.body.classList.add('is-dragging');
}

function handlePointerMove(event: PointerEvent) {
    if(!unref(isPanning)) return;
    hasMoved.value = true;
    const dx = event.clientX - unref(panStart).x;
    const dy = event.clientY - unref(panStart).y;
    pan.value = {
        x: unref(panStart).panX + dx,
        y: unref(panStart).panY + dy,
    };
}

function endPan() {
    isPanning.value = false;
    document.body.classList.remove('is-dragging');
}

function handlePointerUp() {
    if(unref(isPanning)) endPan();
    if(unref(draggingNode)) {
        draggingNode.value = undefined;
        document.body.classList.remove('is-dragging');
    }
    // 延迟重置 hasMoved，确保紧跟 pointerup 的 click 事件能读到 true
    if(unref(hasMoved)) {
        setTimeout(() => { hasMoved.value = false; }, 0);
    }
}

// ---------- Node drag (repositioning) ----------
function startNodeDrag(event: PointerEvent, node: TopologyNode) {
    // left button only, ignore when modifiers indicate the user wants something else
    if(event.button !== 0) return;
    event.stopPropagation();
    draggingNode.value = node;
    hasMoved.value = false;
    const svg = unref(svgRef);
    if(!svg) return;
    const rect = svg.getBoundingClientRect();
    // convert mouse to world coordinates (undo pan + scale)
    const wx = (event.clientX - rect.left - unref(pan).x) / unref(scale);
    const wy = (event.clientY - rect.top - unref(pan).y) / unref(scale);
    dragOffset.value = {x: wx - node.x, y: wy - node.y};
    document.body.classList.add('is-dragging');
}

function handleNodeDragMove(event: PointerEvent) {
    const node = unref(draggingNode);
    if(!node) return;
    hasMoved.value = true;
    const svg = unref(svgRef);
    if(!svg) return;
    const rect = svg.getBoundingClientRect();
    const wx = (event.clientX - rect.left - unref(pan).x) / unref(scale);
    const wy = (event.clientY - rect.top - unref(pan).y) / unref(scale);
    node.x = wx - unref(dragOffset).x;
    node.y = wy - unref(dragOffset).y;
}

// ---------- Fit to view ----------
async function nextTickFit() {
    // wait one frame so svg dimensions settle
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    const svg = unref(svgRef);
    if(!svg) return;
    const rect = svg.getBoundingClientRect();
    if(!rect.width || !rect.height) return;
    const padding = 40;
    const sx = (rect.width - padding * 2) / unref(contentBounds).width;
    const sy = (rect.height - padding * 2) / unref(contentBounds).height;
    const newScale = clampScale(Math.min(sx, sy));
    scale.value = newScale;
    // center
    pan.value = {
        x: padding + (rect.width - padding * 2 - unref(contentBounds).width * newScale) / 2,
        y: padding + (rect.height - padding * 2 - unref(contentBounds).height * newScale) / 2,
    };
}

function resetView() {
    nextTickFit();
}

// ---------- Hover handlers (locked during drag/pan to preserve highlight) ----------
function onNodeHoverEnter(node: TopologyNode) {
    if(unref(draggingNode) || unref(isPanning)) return;
    hoveredNodeId.value = node.id;
}
function onNodeHoverLeave() {
    if(unref(draggingNode) || unref(isPanning)) return;
    hoveredNodeId.value = undefined;
}
function onEdgeHoverEnter(edge: TopologyEdge) {
    if(unref(draggingNode) || unref(isPanning)) return;
    hoveredEdgeId.value = edge.id;
}
function onEdgeHoverLeave() {
    if(unref(draggingNode) || unref(isPanning)) return;
    hoveredEdgeId.value = undefined;
}

// ---------- Click handlers ----------
function onNodeClick(node: TopologyNode) {
    // 拖拽节点后松开会触发 click，此时不应切换选中
    if(unref(hasMoved)) return;
    if(unref(selectedNodeId) === node.id) {
        // deselect
        selectedNodeId.value = undefined;
        upstreamIds.value = new Set();
        downstreamIds.value = new Set();
        return;
    }
    selectedNodeId.value = node.id;
    upstreamIds.value = collectReachable(node.id, 'up');
    downstreamIds.value = collectReachable(node.id, 'down');
}

function onBackgroundClick(event: MouseEvent) {
    // 拖拽平移后松开会触发 click，此时不应清除选中
    if(unref(hasMoved)) return;
    // click on empty background clears selection
    if(event.target === unref(svgRef) || event.target === unref(contentRef)) {
        selectedNodeId.value = undefined;
        upstreamIds.value = new Set();
        downstreamIds.value = new Set();
    }
}

// ---------- Wire up window-level listeners (pointer up / move for drag/pan release) ----------
useEventListener(window, 'pointermove', (event: PointerEvent) => {
    if(unref(isPanning)) {
        handlePointerMove(event);
    } else if(unref(draggingNode)) {
        handleNodeDragMove(event);
    }
}, {passive: true});
useEventListener(window, 'pointerup', handlePointerUp);
useEventListener(window, 'pointercancel', handlePointerUp);

onBeforeUnmount(() => {
    document.body.classList.remove('is-dragging');
});

// ---------- Lifecycle / props reactions ----------
watch(() => props.refreshKey, () => {
    runLayout();
}, {immediate: true});

// expose resetView to parent via ref
defineExpose({resetView, runLayout});
</script>

<template>
    <div class="topology-graph-root">
        <svg
            ref="svgRef"
            class="topology-svg"
            @wheel="handleWheel"
            @pointerdown="startPan"
            @click="onBackgroundClick"
        >
            <g ref="contentRef" :style="transformStyle">
                <!-- edges (drawn first so nodes sit on top) -->
                <g class="edges-layer">
                    <template v-for="edge in graph.edges" :key="edge.id">
                        <path
                            class="topology-edge"
                            :class="{highlighted: isEdgeHighlighted(edge), faded: isEdgeFaded(edge)}"
                            :d="edgePath(edge)"
                            :stroke-width="edgeStrokeWidth(edge)"
                            @pointerenter="onEdgeHoverEnter(edge)"
                            @pointerleave="onEdgeHoverLeave()"
                        />
                        <!-- edge label: 产物图标 + 名称 + 速率 -->
                        <g
                            class="edge-label-group"
                            :class="{highlighted: isEdgeHighlighted(edge), faded: isEdgeFaded(edge)}"
                            :transform="`translate(${edgeMidpoint(edge).x}, ${edgeMidpoint(edge).y})`"
                            @pointerenter="onEdgeHoverEnter(edge)"
                            @pointerleave="onEdgeHoverLeave()"
                        >
                            <foreignObject
                                class="edge-label-foreign"
                                x="-90" y="-14"
                                width="180" height="28"
                            >
                                <div class="edge-label-chip" xmlns="http://www.w3.org/1999/xhtml">
                                    <icon-component
                                        v-if="edge.productImage"
                                        class="edge-label-icon"
                                        :image="edge.productImage"
                                    />
                                    <span class="edge-label-name">{{ edge.productLabel }}</span>
                                    <span class="edge-label-rate" v-if="edge.rateLabel">{{ edge.rateLabel }}</span>
                                </div>
                            </foreignObject>
                        </g>
                    </template>
                </g>

                <!-- nodes -->
                <g class="nodes-layer">
                    <template v-for="node in graph.nodes" :key="node.id">
                        <g
                            class="topology-node"
                            :class="{highlighted: isNodeHighlighted(node), faded: isNodeFaded(node), selected: selectedNodeId === node.id}"
                            :transform="`translate(${node.x}, ${node.y})`"
                            @pointerenter="onNodeHoverEnter(node)"
                            @pointerleave="onNodeHoverLeave()"
                            @pointerdown="startNodeDrag($event, node)"
                            @click.stop="onNodeClick(node)"
                        >
                            <rect
                                class="node-bg"
                                :width="node.width"
                                :height="node.height"
                                rx="14"
                            />
                            <foreignObject
                                :width="node.width"
                                :height="node.height"
                                class="node-foreign"
                            >
                                <div class="node-content" xmlns="http://www.w3.org/1999/xhtml">
                                    <div class="node-icon">
                                        <icon-component :image="node.image" />
                                    </div>
                                    <div class="node-text">
                                        <div class="node-label">{{ node.label }}</div>
                                        <div class="node-count">
                                            <template v-if="node.solvedCount !== undefined">
                                                ×{{ node.solvedCount.toFixed(node.solvedCount >= 100 ? 0 : 1) }}
                                            </template>
                                            <template v-else-if="node.count !== undefined">
                                                ×{{ node.count.toFixed(node.count >= 100 ? 0 : 1) }}
                                            </template>
                                            <template v-else>—</template>
                                        </div>
                                    </div>
                                </div>
                            </foreignObject>
                        </g>
                    </template>
                </g>
            </g>
        </svg>

        <!-- empty / loading state -->
        <div v-if="!graph.nodes.length" class="topology-empty">
            <v-icon :icon="mdiAlert" />
            <div>当前蓝图为空，无法生成拓扑。</div>
        </div>
        <div v-else-if="layoutError" class="topology-empty topology-error">
            <v-icon :icon="mdiAlert" color="error" />
            <div>拓扑布局失败：{{ layoutError }}</div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.topology-graph-root {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    // 拓扑图是可视化组件，文字不需要被选中，防止拖拽时框选变蓝
    user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    background:
        radial-gradient(at 12% 8%, rgba(88, 166, 255, 0.07) 0px, transparent 55%),
        radial-gradient(at 88% 4%, rgba(56, 139, 253, 0.06) 0px, transparent 50%),
        radial-gradient(at 96% 92%, rgba(110, 118, 129, 0.06) 0px, transparent 60%);
}
.topology-svg {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
    background: transparent;
}
.topology-svg:active {
    cursor: grabbing;
}

// edges
.topology-edge {
    fill: none;
    stroke: rgba(88, 166, 255, 0.4);
    transition:
        stroke 0.18s ease,
        stroke-width 0.18s ease,
        opacity 0.18s ease;
}
.topology-edge.highlighted {
    stroke: rgb(var(--v-theme-primary));
    stroke-width: 3;
}
.topology-edge.faded {
    opacity: 0.15;
}

.edge-label-group {
    transition: opacity 0.18s ease;
    pointer-events: bounding-box;
    cursor: help;
}
.edge-label-group.faded {
    opacity: 0.2;
}
.edge-label-foreign {
    pointer-events: none;
    overflow: visible;
}
.edge-label-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 4px;
    background: var(--glass-bg-strong, rgba(255, 255, 255, 0.92));
    border: 1px solid var(--glass-border-inner, rgba(255, 255, 255, 0.5));
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    line-height: 1;
    box-sizing: border-box;
}
:deep(.v-theme--dark) .edge-label-chip {
    background: rgba(22, 27, 34, 0.92);
    border-color: rgba(240, 246, 252, 0.12);
}
.edge-label-icon {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
}
.edge-label-name {
    font-size: 11px;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 110px;
}
.edge-label-rate {
    font-size: 11px;
    font-weight: 700;
    color: rgb(var(--v-theme-primary));
    margin-left: 2px;
}

// nodes
.topology-node {
    cursor: grab;
    transition: opacity 0.18s ease;
}
.topology-node:active {
    cursor: grabbing;
}
.topology-node.faded {
    opacity: 0.2;
}
.node-bg {
    fill: var(--glass-bg-strong, rgba(255, 255, 255, 0.85));
    stroke: var(--glass-border, rgba(255, 255, 255, 0.6));
    stroke-width: 1;
    transition:
        stroke 0.18s ease,
        stroke-width 0.18s ease,
        filter 0.18s ease;
    filter: drop-shadow(0 4px 12px rgba(15, 23, 42, 0.08));
}
:deep(.v-theme--dark) .node-bg {
    fill: rgba(22, 27, 34, 0.88);
    stroke: rgba(240, 246, 252, 0.12);
}
.topology-node.highlighted .node-bg {
    stroke: rgb(var(--v-theme-primary));
    stroke-width: 2;
    filter: drop-shadow(0 8px 20px rgba(88, 166, 255, 0.25));
}
.topology-node.selected .node-bg {
    stroke: rgb(var(--v-theme-primary));
    stroke-width: 2.5;
    filter: drop-shadow(0 8px 24px rgba(88, 166, 255, 0.35));
}

.node-foreign {
    pointer-events: none;
}
.node-content {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}
.node-icon {
    flex: 0 0 auto;
}
.node-text {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
}
.node-label {
    font-size: 13px;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.node-count {
    font-size: 11px;
    color: rgb(var(--v-theme-primary));
    margin-top: 2px;
    font-weight: 500;
    line-height: 1.2;
}

// empty state
.topology-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(var(--v-theme-on-surface), 0.6);
    font-size: 14px;
    pointer-events: none;
}
.topology-error {
    color: rgb(var(--v-theme-error));
}
</style>
