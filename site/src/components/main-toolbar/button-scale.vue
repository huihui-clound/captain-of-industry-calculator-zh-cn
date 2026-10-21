<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {t} from '@/scripts/i18n';
import {computed} from 'vue';
import {mdiMagnify} from '@mdi/js';
import {injectSettings} from '@/scripts/settings';

const settings = injectSettings();

const scalePercent = computed({
    get: () => Math.round(settings.scale * 100),
    set: (value: number) => { settings.scale = value / 100; },
});
</script>

<template>
    <v-menu density="compact" :close-on-content-click="false">
        <template #activator="{ props }">
            <v-tooltip :text="t('toolbar.scale')" location="bottom">
                <template #activator="{ props: _props }">
                    <v-btn v-bind="{..._props, ...props}" icon class="glass-tooltip-btn">
                        <v-badge :content="scalePercent" color="primary">
                            <v-icon :icon="mdiMagnify" />
                        </v-badge>
                    </v-btn>
                </template>
            </v-tooltip>
        </template>
        <v-sheet min-width="300" class="glass-panel-strong pa-3">
            <v-slider
                v-model="scalePercent"
                class="scale-slider"
                color="primary"
                :min="20"
                :max="200"
                :step="10"
            >
                <template #append>
                    <v-chip color="primary" variant="tonal">{{ scalePercent }} %</v-chip>
                </template>
            </v-slider>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.scale-slider {
    margin-left: 0.5em;
    margin-right: 0.5em;
    margin-top: 0.25em;
}
</style>
