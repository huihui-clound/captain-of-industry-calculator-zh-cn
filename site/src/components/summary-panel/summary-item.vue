<!--
Author: Alexey Usov (dax@xdax.ru, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {injectFilter} from '@/scripts/filter';
import {formatItem} from '@/scripts/format';
import type {SummaryItem} from '@/scripts/model/store';
import {computed} from 'vue';

const props = defineProps<{
    item: SummaryItem;
    compact?: boolean;
    format?: boolean;
}>();

const filter = injectFilter();
const totalCountPerSecond = computed(() => (props.format
    ? formatItem(props.item.totalCountPerSecond, props.item.item)
    : props.item.totalCountPerSecond)
    || '');
const border = computed(() => {
    if(filter.key == props.item.item.name)
        return 'highlight-border';
    return '';
});
function filterForSummary() {
    if(filter.key != props.item.item.name) {
        filter.key = props.item.item.name;
    } else {
        filter.key = undefined;
    }
}
</script>

<template>
    <v-list-item :class="props.compact ? 'pl-0 summary-row compact' : 'summary-row'">
        <template #prepend>
            <div class="d-flex flex-column align-start">
                <icon-component :image="props.item.item.image" class="hover-border" :class="border" @click.stop="filterForSummary()" />
                <div v-if="props.compact" class="text-caption compact-count">
                    {{ totalCountPerSecond }}
                </div>
            </div>
        </template>
        <template #title>
            <div v-if="!props.compact" class="pl-2 text-body-2 details">
                <span class="summary-count">{{ totalCountPerSecond }}</span>
                {{ ' ' }}
                <span class="summary-label">{{ props.item.item.label }}</span>
            </div>
        </template>
    </v-list-item>
</template>

<style scoped>
.summary-row {
    border-radius: var(--glass-radius-sm);
    margin-bottom: 2px;
    transition: background-color 0.18s ease;
}
.summary-row:hover {
    background: var(--glass-bg-subtle);
}
.summary-row.compact {
    background: transparent;
}
.details {
    white-space: normal;
}
.summary-count {
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
}
.summary-label {
    opacity: 0.85;
}
.compact-count {
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
}
</style>
