declare const __APP_VERSION__: string;
const app = document.getElementById('app');
if (app) app.dataset.version = __APP_VERSION__;
