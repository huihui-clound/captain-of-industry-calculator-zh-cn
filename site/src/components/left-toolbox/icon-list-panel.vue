<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import type {GameItem} from '#types/game-data';
import {SelectedClassType, useLeftPanelDragAndDrop, usePointAndClick} from '@/composables/drag-helpers';
import {injectFilter} from '@/scripts/filter';
import {unref} from 'vue';

const {dragStart} = useLeftPanelDragAndDrop();
const {selectedItem, selectItem} = usePointAndClick();

const filter = injectFilter();

function computedItemClass(item: GameItem) {
    if(unref(selectedItem)?.isSelected(item))
        return ['selected-border'];
    return [];
}
</script>

<template>
    <div class="icon-panel-root">
        <icon-list-filter />
        <div class="icon-div-parent bg-window-idle glass-panel">
            <optimized-tooltip>
                <template v-for="(group, _index1) in filter.buildFilter()" :key="_index1">
                    <v-divider v-if="_index1" />
                    <template v-for="item in group" :key="item.name">
                        <div
                            class="icon-row rounded glass-hover"
                            :class="computedItemClass(item)"
                            :data-tooltip="item.label"
                            @pointerdown.left="dragStart($event, item)"
                            @click="selectItem(SelectedClassType.Item, item)"
                        >
                            <icon-component :image="item.image" />
                            <span class="icon-label">{{ item.label }}</span>
                        </div>
                    </template>
                </template>
            </optimized-tooltip>
        </div>
    </div>
</template>

<style scoped>
.icon-panel-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px;
    gap: 12px;
    overflow: hidden;
}
.icon-div-parent {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 8px;
    border-radius: var(--glass-radius);
}
.icon-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    margin-bottom: 4px;
    cursor: grab;
    background: var(--glass-bg-subtle);
    border: 1px solid var(--glass-border-inner);
}
.icon-row:last-child {
    margin-bottom: 0;
}
.icon-label {
    font-size: 13px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
    color: rgb(var(--v-theme-on-surface));
    opacity: 0.85;
}
.icon-draggable {
    position: fixed;
    z-index: 5000;
}
</style>
