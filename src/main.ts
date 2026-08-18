import { createApp } from 'vue';
import { createPinia } from 'pinia';
// Bootstrap CSS/JS agora vêm pelo CDN no index.html (evita carregar/dar
// bootstrap*.js duas vezes, o que duplicaria os handlers de dropdown/modal).
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import App from './App.vue';

const pinia = createPinia();

createApp(App).use(pinia).mount('#app');
