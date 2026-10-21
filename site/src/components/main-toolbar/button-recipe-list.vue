<!--
Author: Alexey Usov (dax@xdax.ru, https://t.me/doubleaxe, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
-->
<script setup lang="ts">
import {mdiBookOpenVariant} from '@mdi/js';
import {ref} from 'vue';
import RecipeListDialog from '@/components/recipe-list/recipe-list-dialog.vue';

const showRecipeListDialog = ref(false);
</script>

<template>
    <tooltip-button
        tooltip="配方总览"
        :icon="mdiBookOpenVariant"
        @click="showRecipeListDialog = true"
    />
    <recipe-list-dialog v-model="showRecipeListDialog" />
</template>
