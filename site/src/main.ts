/*
Author: Alexey Usov (dax@xdax.ru, https://github.com/doubleaxe)
Please don't remove this comment if you use unmodified file
*/

import {createApp} from 'vue';
import {createVuetify} from 'vuetify';
import {aliases, mdi} from 'vuetify/iconsets/mdi-svg';
import App from './app.vue';
import {applyDocumentLang, locale} from './scripts/i18n';

import './assets/vuetify.scss';
import './assets/main.scss';

applyDocumentLang(locale.value);

//Modified by Marvis: language switch removed (Chinese only), drop legacy locale preference.
try {
    localStorage.removeItem('daxfb-locale');
} catch(err) {
    //no-op
}

const app = createApp(App);

app.use(createVuetify({
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
    theme: {
        defaultTheme: 'light',
        themes: {
            light: {
                dark: false,
                colors: {
                    background: '#eef2fb',
                    surface: '#f6f8fd',
                    primary: '#3d5afe',
                    'primary-darken-1': '#1f3ad6',
                    secondary: '#5c6bc0',
                    'secondary-darken-1': '#3949ab',
                    success: '#26a69a',
                    info: '#42a5f5',
                    warning: '#ffb74d',
                    error: '#ef5350',
                },
            },
            dark: {
                dark: true,
                colors: {
                    background: '#0d1224',
                    surface: '#161c34',
                    primary: '#7b8cff',
                    'primary-darken-1': '#3d5afe',
                    secondary: '#9fa8da',
                    'secondary-darken-1': '#5c6bc0',
                    success: '#4db6ac',
                    info: '#64b5f6',
                    warning: '#ffca28',
                    error: '#e57373',
                },
            },
        },
    },
}));

app.mount('#app');
