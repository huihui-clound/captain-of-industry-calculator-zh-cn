<!--
Author: Alexey Usov (dax@xdax.ru, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {mdiClose} from '@mdi/js';
import {injectSettings} from '@/scripts/settings';
import {useVModel} from '@vueuse/core';
import {DEFAULT_BLUEPRINT_SPLIT, DEFAULT_PRECISION, MIN_PRECISION} from '@/scripts/types';
import {t} from '@/scripts/i18n';

const props = defineProps<{
    modelValue: boolean;
}>();
const emit = defineEmits(['update:modelValue']);
const dialog = useVModel(props, 'modelValue', emit);

const settings = injectSettings();
</script>

<template>
    <v-row justify="center">
        <v-dialog
            v-model="dialog"
            max-width="640"
            class="settings-dialog-wrap"
            scrim
        >
            <div class="settings-dialog glass-panel-strong">
                <v-toolbar flat color="transparent" class="settings-toolbar">
                    <v-toolbar-title class="font-weight-medium">{{ t('settings.title') }}</v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        :icon="mdiClose"
                        variant="text"
                        @click="dialog = false"
                    />
                </v-toolbar>
                <v-list subheader density="compact" :lines="false" class="settings-list">
                    <v-list-subheader>{{ t('settings.appearance') }}</v-list-subheader>
                    <v-list-item :title="t('settings.darkTheme')" @click="settings.darkTheme = !settings.darkTheme">
                        <template #subtitle>
                            {{ t('settings.darkTheme.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.darkTheme" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item :title="t('settings.colorfulLinks')" @click="settings.colorfulLinks = !settings.colorfulLinks">
                        <template #subtitle>
                            {{ t('settings.colorfulLinks.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.colorfulLinks" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item :title="t('settings.countControls')" @click="settings.showCountControlsOnWindow = !settings.showCountControlsOnWindow">
                        <template #subtitle>
                            {{ t('settings.countControls.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.showCountControlsOnWindow" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-subheader>{{ t('settings.calculations') }}</v-list-subheader>
                    <v-list-item :title="t('settings.solvePrecision')">
                        <template #subtitle>
                            {{ t('settings.solvePrecision.hint') }}
                        </template>
                        <input-number
                            v-model="settings.solvePrecision"
                            :max="1"
                            :min="0"
                            :default-min="MIN_PRECISION"
                            :default-value="DEFAULT_PRECISION"
                        />
                    </v-list-item>
                    <v-list-subheader>{{ t('settings.actions') }}</v-list-subheader>
                    <v-list-item :title="t('settings.dragAndDrop')" @click="settings.dragAndDropEnabled = !settings.dragAndDropEnabled">
                        <template #subtitle>
                            {{ t('settings.dragAndDrop.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.dragAndDropEnabled" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item
                        :disabled="!settings.dragAndDropEnabled"
                        :title="t('settings.overflowScroll')"
                        @click="settings.overflowScrollEnabled = !settings.overflowScrollEnabled"
                    >
                        <template #subtitle>
                            {{ t('settings.overflowScroll.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.overflowScrollEnabled" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item :title="t('settings.dragAndScroll')" @click="settings.dragAndScrollEnabled = !settings.dragAndScrollEnabled">
                        <template #subtitle>
                            {{ t('settings.dragAndScroll.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.dragAndScrollEnabled" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item
                        :disabled="!settings.dragAndScrollEnabled"
                        :title="t('settings.dragAndScrollOutside')"
                        @click="settings.dragAndScrollOutsideWindow = !settings.dragAndScrollOutsideWindow"
                    >
                        <template #subtitle>
                            {{ t('settings.dragAndScrollOutside.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.dragAndScrollOutsideWindow" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item :title="t('settings.pointAndClick')" @click="settings.pointAndClickEnabled = !settings.pointAndClickEnabled">
                        <template #subtitle>
                            {{ t('settings.pointAndClick.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.pointAndClickEnabled" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item :title="t('settings.scrollScale')" @click="settings.scrollScaleEnabled = !settings.scrollScaleEnabled">
                        <template #subtitle>
                            {{ t('settings.scrollScale.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.scrollScaleEnabled" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-subheader>{{ t('settings.save') }}</v-list-subheader>
                    <v-list-item :title="t('settings.compress')" @click="settings.blueprintCompress = !settings.blueprintCompress">
                        <template #subtitle>
                            {{ t('settings.compress.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.blueprintCompress" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item
                        :disabled="settings.blueprintCompress"
                        :title="t('settings.encode')"
                        @click="settings.blueprintEncode = !settings.blueprintEncode"
                    >
                        <template #subtitle>
                            {{ t('settings.encode.hint') }}
                        </template>
                        <template #prepend>
                            <v-checkbox v-model="settings.blueprintEncode" color="primary" />
                        </template>
                    </v-list-item>
                    <v-list-item
                        :disabled="!settings.blueprintCompress && !settings.blueprintEncode"
                        :title="t('settings.split')"
                    >
                        <template #subtitle>
                            {{ t('settings.split.hint') }}
                        </template>
                        <input-number
                            v-model="settings.blueprintSplit"
                            :min="0"
                            :default-value="DEFAULT_BLUEPRINT_SPLIT"
                        />
                    </v-list-item>
                </v-list>
            </div>
        </v-dialog>
    </v-row>
</template>

<style scoped>
.settings-dialog-wrap :deep(.v-overlay__content) {
    max-height: 88vh;
}
.settings-dialog {
    border-radius: var(--glass-radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 88vh;
}
.settings-toolbar {
    border-bottom: 1px solid var(--glass-border-inner);
}
.settings-list {
    overflow-y: auto;
    padding: 8px 4px;
    background: transparent;
}
.settings-list :deep(.v-list-item) {
    border-radius: var(--glass-radius-sm);
    margin-bottom: 2px;
}
.settings-list :deep(.v-list-item:hover) {
    background: var(--glass-bg-subtle);
}
.settings-list :deep(.v-list-subheader) {
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 11px;
    padding-inline-start: 12px;
    margin-top: 8px;
}
</style>
