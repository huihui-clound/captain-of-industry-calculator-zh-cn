<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script lang="ts">
export default {
    inheritAttrs: false,
};
</script>
<script setup lang="ts">
const props = defineProps<{
    tooltip: string;
}>();
</script>

<template>
    <v-tooltip :text="props.tooltip" location="bottom">
        <template #activator="{ props: _props }">
            <v-btn v-bind="{..._props, ...$attrs}" class="glass-tooltip-btn" />
        </template>
    </v-tooltip>
</template>

<style>
.glass-tooltip-btn.v-btn--icon,
.glass-tooltip-btn.v-btn--variant-text {
    background: var(--glass-bg-subtle) !important;
    border: 1px solid var(--glass-border-inner) !important;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    transition:
        background-color 0.18s ease,
        border-color 0.18s ease,
        transform 0.18s ease;
}
.glass-tooltip-btn.v-btn--icon:hover,
.glass-tooltip-btn.v-btn--variant-text:hover {
    background: var(--glass-bg-strong) !important;
    border-color: var(--glass-border) !important;
    transform: translateY(-1px);
}
</style>
