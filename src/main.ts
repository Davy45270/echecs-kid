import './ui/style.css';
import { go } from './shell/router';
import { browserStorage, readSave } from './shell/storage';
import { regler } from './shell/voix';

declare const __APP_VERSION__: string;
const app = document.getElementById('app');
if (app) {
    app.dataset.version = __APP_VERSION__;
    regler(readSave(browserStorage()).volume);
    go('accueil');
}
