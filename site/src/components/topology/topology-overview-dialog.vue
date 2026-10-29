<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {injectBlueprintModel} from '@/scripts/model/store';
import {useVModel} from '@vueuse/core';
import {mdiClose, mdiRefresh, mdiFitToScreen, mdiChartTimelineVariant} from '@mdi/js';
import {computed, reactive, ref, unref, watch} from 'vue';
import {buildTopologyGraph, type TopologyGraph} from '@/scripts/graph/topology-builder';
import TopologyGraphView from './topology-graph.vue';

const props = defineProps<{
    modelValue: boolean;
}>();
const emit = defineEmits(['update:modelValue']);
const dialog = useVModel(props, 'modelValue', emit);

const blueprintModel = injectBlueprintModel();

// snapshot of the topology graph. Wrapped in a ref holding a *reactive* graph
// so that in-place mutations performed by the topology-graph component
// (dragging a node, re-running layout) are reflected in the template.
const graph = ref<TopologyGraph>(reactive({nodes: [], edges: [], width: 0, height: 0}));
// bump this to force topology-graph.vue to re-run its layout effect
const refreshKey = ref(0);
// reference to the topology-graph component so we can call its exposed methods
const graphComponent = ref<InstanceType<typeof TopologyGraphView> | null>(null);

const hasItems = computed(() => [...blueprintModel.items].length > 0);

const stats = computed(() => {
    const g = unref(graph);
    return {
        nodes: g.nodes.length,
        edges: g.edges.length,
    };
});

function buildSnapshot() {
    // wrap the fresh snapshot in reactive() so subsequent in-place mutations
    // (node drag, layout pass) trigger re-render of the topology-graph template.
    graph.value = reactive(buildTopologyGraph(blueprintModel));
    refreshKey.value++;
}

function refreshFromBlueprint() {
    buildSnapshot();
}

function fitView() {
    unref(graphComponent)?.resetView();
}

watch(() => props.modelValue, (value, oldValue) => {
    if(value && !oldValue) {
        // opening: rebuild snapshot from current blueprint state
        buildSnapshot();
    }
});
</script>

<template>
    <v-dialog
        v-model="dialog"
        max-width="95vw"
        class="topology-dialog-wrap"
        scrim
    >
        <div class="topology-dialog glass-panel-strong">
            <v-toolbar flat color="transparent" class="topology-toolbar">
                <v-icon :icon="mdiChartTimelineVariant" color="primary" class="ml-2" />
                <v-toolbar-title class="font-weight-medium topology-title">
                    蓝图拓扑总览
                </v-toolbar-title>
                <div class="topology-stats text-caption">
                    <span class="stat-pill">{{ stats.nodes }} 节点</span>
                    <span class="stat-pill">{{ stats.edges }} 连线</span>
                </div>
                <v-spacer />
                <tooltip-button
                    tooltip="重新生成（基于当前蓝图）"
                    :icon="mdiRefresh"
                    :disabled="!hasItems"
                    @click="refreshFromBlueprint()"
                />
                <tooltip-button
                    tooltip="适配窗口"
                    :icon="mdiFitToScreen"
                    @click="fitView()"
                />
                <v-btn
                    :icon="mdiClose"
                    variant="text"
                    @click="dialog = false"
                />
            </v-toolbar>
            <div class="topology-body">
                <topology-graph-view
                    v-if="graph.nodes.length || !hasItems"
                    ref="graphComponent"
                    :graph="graph"
                    :refresh-key="refreshKey"
                />
                <div v-else-if="hasItems && !graph.nodes.length" class="topology-loading">
                    <v-progress-circular indeterminate color="primary" />
                </div>
            </div>
            <div class="topology-hint text-caption">
                鼠标滚轮缩放 · 拖拽空白处平移 · 拖拽节点重排 · 单击节点高亮上下游
            </div>
        </div>
    </v-dialog>
</template>

<style scoped>
.topology-dialog-wrap :deep(.v-overlay__content) {
    width: min(95vw, 1400px);
    max-width: 95vw;
    height: min(90vh, 920px);
    max-height: 90vh;
}
.topology-dialog {
    border-radius: var(--glass-radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-shadow: var(--glass-shadow-elevated), var(--glass-inset-highlight);
}
.topology-toolbar {
    border-bottom: 1px solid var(--glass-border-inner);
    min-height: 56px;
}
.topology-title {
    letter-spacing: 0.01em;
    margin-inline-start: 4px;
}
.topology-stats {
    display: flex;
    gap: 6px;
    margin-inline-start: 12px;
}
.stat-pill {
    background: var(--glass-bg-subtle);
    border: 1px solid var(--glass-border-inner);
    border-radius: 999px;
    padding: 2px 10px;
    font-weight: 500;
    color: rgb(var(--v-theme-primary));
}
.topology-body {
    flex: 1 1 auto;
    position: relative;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.35);
}
:deep(.v-theme--dark) .topology-body {
    background: rgba(13, 17, 23, 0.5);
}
.topology-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
.topology-hint {
    padding: 8px 16px;
    border-top: 1px solid var(--glass-border-inner);
    color: rgba(var(--v-theme-on-surface), 0.55);
    text-align: center;
    background: var(--glass-bg-subtle);
}
</style>
