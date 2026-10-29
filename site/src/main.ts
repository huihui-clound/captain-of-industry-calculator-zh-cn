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
        // 参照 dsp_blueprint_editor（GitHub 风格）：默认深色主题
        defaultTheme: 'dark',
        themes: {
            light: {
                dark: false,
                colors: {
                    background: '#e8ecf0',
                    surface: '#f6f8fa',
                    primary: '#0969da',
                    'primary-darken-1': '#0550ae',
                    secondary: '#57606f',
                    'secondary-darken-1': '#3d444d',
                    success: '#1a7f37',
                    info: '#0969da',
                    warning: '#9a6700',
                    error: '#cf222e',
                },
            },
            dark: {
                dark: true,
                colors: {
                    background: '#0d1117',
                    surface: '#161b22',
                    primary: '#58a6ff',
                    'primary-darken-1': '#1f6feb',
                    secondary: '#8b949e',
                    'secondary-darken-1': '#6e7781',
                    success: '#3fb950',
                    info: '#58a6ff',
                    warning: '#d29922',
                    error: '#f85149',
                },
            },
        },
    },
}));

app.mount('#app');
