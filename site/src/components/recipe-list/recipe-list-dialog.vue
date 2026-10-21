<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {injectGameData} from '@/scripts/data';
import {useVModel} from '@vueuse/core';
import {mdiClose, mdiMagnify, mdiChevronRight, mdiBookOpenVariant} from '@mdi/js';
import {useDebounceFn} from '@vueuse/core';
import {computed, ref, unref, watch} from 'vue';
import {
    buildRecipeList,
    filterRecipes,
    type RecipeListRow,
} from '@/scripts/recipe-list-data';
import type {GameRecipeIO} from '#types/game-data';
import IconComponent from '@/components/icon-component.vue';

const props = defineProps<{
    modelValue: boolean;
}>();
const emit = defineEmits(['update:modelValue']);
const dialog = useVModel(props, 'modelValue', emit);

const gameData = injectGameData();

// build full recipe list once (lazy: only when dialog first opens)
const allRows = ref<RecipeListRow[]>([]);
const search = ref('');
const filteredRows = ref<RecipeListRow[]>([]);
const initialized = ref(false);

// pagination
const pageSize = 20;
const page = ref(1);
const totalPages = computed(() => Math.ceil(unref(filteredRows).length / pageSize) || 1);
const currentPageRows = computed(() => {
    const start = (unref(page) - 1) * pageSize;
    return unref(filteredRows).slice(start, start + pageSize);
});

function ensureInitialized() {
    if(unref(initialized)) return;
    allRows.value = buildRecipeList(gameData);
    filteredRows.value = unref(allRows);
    initialized.value = true;
}

const applyFilter = useDebounceFn(() => {
    filteredRows.value = filterRecipes(unref(allRows), unref(search));
    page.value = 1;
}, 300, {maxWait: 800});

watch(() => props.modelValue, (value, oldValue) => {
    if(value && !oldValue) {
        ensureInitialized();
    }
});

watch(search, () => {
    applyFilter();
});

const stats = computed(() => ({
    total: unref(allRows).length,
    filtered: unref(filteredRows).length,
}));

// 双击产物 chip：以该产物名称作为搜索词立即搜索
function onIoDblClick(io: GameRecipeIO) {
    search.value = io.product.label;
    // 立即过滤（不等待 debounce）
    filteredRows.value = filterRecipes(unref(allRows), unref(search));
    page.value = 1;
}
</script>

<template>
    <v-dialog
        v-model="dialog"
        max-width="95vw"
        class="recipe-list-dialog-wrap"
        scrim
    >
        <div class="recipe-list-dialog glass-panel-strong">
            <!-- toolbar -->
            <v-toolbar flat color="transparent" class="recipe-list-toolbar">
                <v-icon :icon="mdiBookOpenVariant" color="primary" class="ml-2" />
                <v-toolbar-title class="font-weight-medium recipe-list-title">
                    配方总览
                </v-toolbar-title>
                <div class="recipe-list-stats text-caption">
                    <span class="stat-pill">{{ stats.filtered }} / {{ stats.total }} 配方</span>
                </div>
                <v-spacer />
                <v-btn
                    :icon="mdiClose"
                    variant="text"
                    @click="dialog = false"
                />
            </v-toolbar>

            <!-- search bar -->
            <div class="recipe-search-bar">
                <v-text-field
                    v-model="search"
                    :prepend-inner-icon="mdiMagnify"
                    placeholder="搜索物品或设备名称（双击下方产物可快速搜索）"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    class="recipe-search-field"
                />
            </div>

            <!-- list header -->
            <div class="recipe-list-header">
                <div class="col-device">设备</div>
                <div class="col-inputs">输入</div>
                <div class="col-arrow"></div>
                <div class="col-outputs">输出</div>
                <div class="col-time">耗时</div>
            </div>

            <!-- list body -->
            <div class="recipe-list-body">
                <template v-for="(row, rowIndex) in currentPageRows" :key="row.id">
                    <div class="recipe-row" :class="{odd: rowIndex % 2 === 1}">
                        <!-- device (leftmost) -->
                        <div class="col-device">
                            <icon-component
                                :image="row.device.image"
                                :data-tooltip="row.device.label"
                                class="device-icon"
                            />
                            <span class="device-name">{{ row.device.label }}</span>
                        </div>

                        <!-- inputs -->
                        <div class="col-inputs">
                            <template v-for="(io, idx) in row.inputs" :key="idx">
                                <div
                                    class="io-chip"
                                    :data-tooltip="`双击搜索: ${io.product.label}`"
                                    @dblclick="onIoDblClick(io)"
                                >
                                    <icon-component
                                        :image="io.product.image"
                                        :data-tooltip="io.product.label"
                                    />
                                    <span class="io-count">×{{ io.count }}</span>
                                </div>
                            </template>
                            <span v-if="!row.inputs.length" class="io-empty">—</span>
                        </div>

                        <!-- arrow -->
                        <div class="col-arrow">
                            <v-icon :icon="mdiChevronRight" size="small" color="primary" />
                        </div>

                        <!-- outputs -->
                        <div class="col-outputs">
                            <template v-for="(io, idx) in row.outputs" :key="idx">
                                <div
                                    class="io-chip"
                                    :data-tooltip="`双击搜索: ${io.product.label}`"
                                    @dblclick="onIoDblClick(io)"
                                >
                                    <icon-component
                                        :image="io.product.image"
                                        :data-tooltip="io.product.label"
                                    />
                                    <span class="io-count">×{{ io.count }}</span>
                                </div>
                            </template>
                            <span v-if="!row.outputs.length" class="io-empty">—</span>
                        </div>

                        <!-- time -->
                        <div class="col-time">
                            <span class="time-value">{{ row.time }}s</span>
                        </div>
                    </div>
                </template>

                <!-- empty state -->
                <div v-if="!currentPageRows.length" class="recipe-empty">
                    <v-icon :icon="mdiMagnify" size="large" />
                    <div>{{ initialized ? '没有匹配的配方' : '加载中...' }}</div>
                </div>
            </div>

            <!-- pagination -->
            <div class="recipe-list-footer">
                <v-pagination
                    v-model="page"
                    :length="totalPages"
                    density="compact"
                    total-visible="7"
                />
            </div>
        </div>
    </v-dialog>
</template>

<style scoped lang="scss">
.recipe-list-dialog-wrap :deep(.v-overlay__content) {
    width: min(95vw, 1200px);
    max-width: 95vw;
    height: min(90vh, 880px);
    max-height: 90vh;
}
.recipe-list-dialog {
    border-radius: var(--glass-radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-shadow: var(--glass-shadow-elevated), var(--glass-inset-highlight);
}
.recipe-list-toolbar {
    border-bottom: 1px solid var(--glass-border-inner);
    min-height: 56px;
}
.recipe-list-title {
    letter-spacing: 0.01em;
    margin-inline-start: 4px;
}
.recipe-list-stats {
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
.recipe-search-bar {
    padding: 12px 16px 8px;
    border-bottom: 1px solid var(--glass-border-inner);
    background: var(--glass-bg-subtle);
}
.recipe-search-field :deep(.v-field) {
    background: var(--glass-bg-strong);
    border-radius: 12px;
}

// table-like header
.recipe-list-header {
    display: grid;
    grid-template-columns: 180px 1fr 32px 1fr 60px;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(var(--v-theme-on-surface), 0.5);
    border-bottom: 2px solid var(--glass-border);
    background: var(--glass-bg-subtle);
    user-select: none;
}

// list body (scrollable)
.recipe-list-body {
    flex: 1 1 auto;
    overflow-y: auto;
}
.recipe-row {
    display: grid;
    grid-template-columns: 180px 1fr 32px 1fr 60px;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--glass-border);
    transition: background 0.15s ease;
    // 奇数行轻微底色，增强行间区分
    &.odd {
        background: rgba(var(--v-theme-surface), 0.25);
    }
}
.recipe-row:hover {
    background: var(--glass-bg-subtle);
}

// columns
.col-device {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}
.device-icon {
    flex: 0 0 auto;
}
.device-name {
    font-size: 12px;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.col-inputs,
.col-outputs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
}
.col-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
}
.col-time {
    text-align: right;
}
.time-value {
    font-size: 12px;
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
    font-variant-numeric: tabular-nums;
}

// IO chips — 可双击搜索
.io-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px 3px 3px;
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border-inner);
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
    user-select: none;
}
.io-chip:hover {
    border-color: rgba(var(--v-theme-primary), 0.5);
    background: var(--glass-bg-subtle);
    transform: translateY(-1px);
}
.io-chip:active {
    transform: translateY(0);
}
.io-count {
    font-size: 11px;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    font-variant-numeric: tabular-nums;
}

.io-empty {
    font-size: 12px;
    color: rgba(var(--v-theme-on-surface), 0.3);
}

// empty state
.recipe-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px;
    color: rgba(var(--v-theme-on-surface), 0.5);
    font-size: 14px;
}

// footer
.recipe-list-footer {
    padding: 4px 16px;
    border-top: 1px solid var(--glass-border-inner);
    background: var(--glass-bg-subtle);
    display: flex;
    justify-content: center;
}
</style>
