<!--
Author: Alexey Usov (dax@xdax.ru, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {t} from '@/scripts/i18n';
import type {GameItem} from '#types/game-data';
import {injectGameData} from '@/scripts/data';
import {injectFilter} from '@/scripts/filter';
import {syncRef, useDebounceFn} from '@vueuse/core';
import {computed, ref, unref, watch} from 'vue';

const gameData = injectGameData();

const {minTier, maxTier} = gameData.gameDescription;
const allTiers = (maxTier > minTier) ? Array.from(Array(1 + maxTier - minTier), (el, i: number) => (i + minTier)) : [];
const filter = injectFilter();
const allItems = gameData.gameItemsArray;
const filteredItems = ref(allItems);

const pageSize = 10;
const page = ref(1);
const pages = computed(() => (Math.ceil(unref(filteredItems).length / pageSize) || 1));
const currentPage = computed(() => {
    const start = (unref(page) - 1) * pageSize;
    return unref(filteredItems).slice(start, start + pageSize);
});
const select = ref<GameItem | undefined>(undefined);
const search = ref('');
const direction = ref('0');
const tierEqual = ref('0');
const updateSearch = useDebounceFn(() => {
    let val = unref(search);
    val = val && val.trim();
    if(!val) {
        filteredItems.value = allItems;
        page.value = 1;
        return;
    }
    const searchText = val.toLowerCase().split(/\s+/).map((s) => s.trim());
    filteredItems.value = allItems.filter((item) => (
        searchText.every((l) => !l || (item.lowerLabel.indexOf(l) > -1))),
    );
    if(unref(page) > unref(pages)) {
        page.value = unref(pages);
    }
}, 400, {maxWait: 1000});
watch(search, (value, oldValue) => {
    if(value != oldValue)
        updateSearch();
});

syncRef(
    //use this instead of toRef, because otherwise this assignment is hard to find
    computed({
        get: () => filter.key,
        set: (value) => { filter.key = value; },
    }),
    computed({
        get: () => unref(select)?.name,
        set: (value?: string) => { select.value = value ? gameData.getGameItem(value) : undefined; },
    }),
);

syncRef(
    //use this instead of toRef, because otherwise this assignment is hard to find
    computed({
        get: () => filter.direction,
        set: (value) => { filter.direction = value; },
    }),
    computed({
        get: () => Number(unref(direction)),
        set: (value: number) => { direction.value = String(value); },
    }),
);

syncRef(
    //use this instead of toRef, because otherwise this assignment is hard to find
    computed({
        get: () => filter.tierEqual,
        set: (value) => { filter.tierEqual = value; },
    }),
    computed({
        get: () => Number(unref(tierEqual)),
        set: (value: number) => { tierEqual.value = String(value); },
    }),
);
</script>

<template>
    <div class="icon-filter-root">
        <v-autocomplete
            v-model="select"
            v-model:search="search"
            clearable
            no-filter
            hide-details
            :label="t('filter.item')"
            :items="currentPage"
            variant="outlined"
            density="comfortable"
            bg-color="transparent"
            class="glass-input"
            @focus="(page = 1)"
        >
            <template #prepend-item>
                <v-btn-toggle
                    v-model="direction"
                    density="compact"
                    class="ml-2 mb-2"
                    group
                    mandatory
                    variant="outlined"
                    color="primary"
                >
                    <v-btn value="-1">{{ t('filter.input') }}</v-btn>
                    <v-btn value="0">{{ t('filter.all') }}</v-btn>
                    <v-btn value="1">{{ t('filter.output') }}</v-btn>
                </v-btn-toggle>
            </template>
            <template #item="{ props, item }">
                <v-list-item v-bind="props" :title="item.raw.label">
                    <template #prepend>
                        <icon-component class="rounded icon-div" :image="item.raw.image" />
                    </template>
                </v-list-item>
            </template>
            <template #selection />
            <template #prepend-inner>
                <icon-component-tooltip
                    v-if="select"
                    class="rounded icon-div"
                    :image="select.image"
                    :tooltip="select.label"
                />
            </template>
            <template #append-item>
                <v-pagination v-model="page" density="compact" :length="pages" :total-visible="5" />
            </template>
        </v-autocomplete>
        <v-select
            v-if="(maxTier > minTier)"
            v-model="filter.tier"
            :label="t('filter.tier')"
            clearable
            hide-details
            :items="allTiers"
            variant="outlined"
            density="comfortable"
            bg-color="transparent"
            class="glass-input"
        >
            <template #prepend-item>
                <v-btn-toggle
                    v-model="tierEqual"
                    density="compact"
                    group
                    mandatory
                    variant="outlined"
                    color="primary"
                >
                    <v-btn value="-1">
                        &lt;=
                    </v-btn>
                    <v-btn value="0">
                        =
                    </v-btn>
                    <v-btn value="1">
                        &gt;=
                    </v-btn>
                </v-btn-toggle>
                <v-list-item :title="t('filter.groupBy')" @click="(filter.groupTier = !filter.groupTier)">
                    <template #prepend>
                        <v-list-item-action start>
                            <v-checkbox v-model="filter.groupTier" hide-details />
                        </v-list-item-action>
                    </template>
                </v-list-item>
            </template>
        </v-select>
    </div>
</template>

<style scoped>
.icon-filter-root {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.glass-input :deep(.v-field) {
    background: var(--glass-bg-subtle) !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: var(--glass-radius-sm);
    box-shadow: inset 0 1px 0 0 var(--glass-highlight);
}
.glass-input :deep(.v-field__outline) {
    --v-field-border-width: 1px;
    opacity: 0.6;
}
.glass-input :deep(.v-field--focused .v-field__outline) {
    opacity: 1;
    color: rgb(var(--v-theme-primary));
}
.glass-input :deep(.v-field--focused) {
    background: var(--glass-bg-strong) !important;
}
</style>
