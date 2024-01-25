import { createApp } from 'vue';
import App from './App.vue';
import ContextMenu from '@imengyu/vue3-context-menu';

// styles
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';

createApp(App).use(ContextMenu).mount('#app');
