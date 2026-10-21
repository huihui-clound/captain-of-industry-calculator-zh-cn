<!--
Author: Alexey Usov (dax@xdax.ru, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {t} from '@/scripts/i18n';
import {injectBlueprintModel} from '@/scripts/model/store';
import {mdiSigma, mdiHome} from '@mdi/js';
import {injectGameData} from '@/scripts/data';

const gameData = injectGameData();
const blueprintModel = injectBlueprintModel();
const homeReference = [location.protocol, '//', location.host, location.pathname].join('')
    + `?gameId=${gameData.gameDescription.name}`;
</script>

<template>
    <div class="main-toolbar">
        <tooltip-button
            :tooltip="t('toolbar.solveGraph')"
            :icon="mdiSigma"
            :disabled="blueprintModel.autoSolveGraph"
            @click="blueprintModel.solveGraph(true)"
        />
        <v-switch v-model="blueprintModel.autoSolveGraph" :label="t('toolbar.auto')" hide-details density="compact" color="primary" class="toolbar-switch" />
        <v-divider vertical class="toolbar-divider" />
        <a :href="homeReference" target="_blank" class="anchor-plain toolbar-link">
            <tooltip-button
                :tooltip="t('toolbar.openAnotherWindow')"
                :icon="mdiHome"
            />
        </a>
        <button-load-share />
        <button-save-share />
        <button-generate-link />
        <button-topology />
        <button-recipe-list />
        <v-divider vertical class="toolbar-divider" />
        <button-scale />
        <slot name="append" />
        <main-toolbar-menu />
    </div>
</template>

<style scoped>
.main-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
    height: 100%;
}
.toolbar-switch {
    margin-inline-start: 4px;
}
.toolbar-divider {
    margin-inline: 4px;
    height: 24px;
    align-self: center;
    opacity: 0.6;
}
.toolbar-link {
    display: inline-flex;
    align-items: center;
}
</style>
