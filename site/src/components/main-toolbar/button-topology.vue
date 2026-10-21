<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {injectBlueprintModel} from '@/scripts/model/store';
import {mdiChartTimelineVariant} from '@mdi/js';
import {computed, ref} from 'vue';
import TopologyOverviewDialog from '@/components/topology/topology-overview-dialog.vue';

const blueprintModel = injectBlueprintModel();
const showTopologyDialog = ref(false);

const hasItems = computed(() => [...blueprintModel.items].length > 0);
</script>

<template>
    <tooltip-button
        :tooltip="hasItems ? '查看蓝图拓扑' : '蓝图为空'"
        :icon="mdiChartTimelineVariant"
        :disabled="!hasItems"
        @click="showTopologyDialog = true"
    />
    <topology-overview-dialog v-model="showTopologyDialog" />
</template>
