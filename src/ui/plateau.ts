// Plateau du gabarit Deplacer : rendu DOM + SVG et gestes (toucher-toucher, ou glisser sans aimant).
import type { Situation } from '../content/situations';
import { pieceSvg } from '../art/pieces';
import { bindDragEnd } from '../shell/drag';
import type { Color, Kind } from '../engine/types';

const MARGE = 12; // marge latérale, de chaque côté
const RESERVE_HAUTEUR = 200; // barre du haut et mascotte
const CASE_MAX = 112;
const CASE_MIN = 56;
const SEUIL_GLISSER = 12;
/** Le contour du glisser dépasse de 24 px au-dessus de la case, pour rester visible sous le doigt. */
export const DECALAGE_CONTOUR = 24;

/** Taille d'une case (px CSS) pour un plateau n×n dans une fenêtre largeur×hauteur. Fonction pure. */
export function taillesCase(largeur: number, hauteur: number, n: number): number {
    const parLargeur = (largeur - 2 * MARGE) / n;
    const parHauteur = (hauteur - RESERVE_HAUTEUR) / n;
    // La hauteur ne fait jamais descendre sous 56 px : mieux vaut défiler verticalement que viser trop petit.
    return Math.max(1, Math.floor(Math.min(CASE_MAX, parLargeur, Math.max(parHauteur, CASE_MIN))));
}

const NOMS: Record<Kind, string> = { R: 'Tour', B: 'Fou', Q: 'Dame', K: 'Roi', N: 'Cavalier', P: 'Pion' };
const COULEURS: Record<Color, string> = { w: 'blanche', b: 'noire' };
const nomCase = (k: string): string => { const [f = 0, r = 0] = k.split(',').map(Number); return `${'abcdefgh'.charAt(f)}${r + 1}`; };

export const etoileSvg = (taille: number): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${taille}" height="${taille}" aria-hidden="true" focusable="false">`
    + '<path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#ffd54a" stroke="#c98f00" stroke-width="5" stroke-linejoin="round"/>'
    + '<path d="M50 20 L57 38 L44 38 Z" fill="#fff6c8" opacity=".8"/></svg>';

const rocherSvg = (taille: number): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${taille}" height="${taille}" aria-hidden="true" focusable="false">`
    + '<ellipse cx="50" cy="86" rx="38" ry="7" fill="#000" fill-opacity=".2"/>'
    + '<path d="M14 82 Q10 58 26 44 Q34 22 56 24 Q78 24 84 46 Q94 62 86 82 Z" fill="#8d8a84" stroke="#4a4740" stroke-width="4" stroke-linejoin="round"/>'
    + '<path d="M32 44 Q40 34 52 34" fill="none" stroke="#c9c5bc" stroke-width="5" stroke-linecap="round"/>'
    + '<path d="M60 58 L70 68 M40 64 L46 72" stroke="#5f5b54" stroke-width="3.5" stroke-linecap="round"/></svg>';

export interface Rappels {
    /** Faux pendant le verrou d'erreur, la démonstration ou la fête : tout toucher est ignoré. */
    actif(): boolean;
    /** Une pièce à soi vient d'être choisie. */
    choisie(k: string): void;
    /** Un coup est tenté (toucher-toucher ou glisser). */
    coup(de: string, vers: string): void;
    /** Tout toucher, même ignoré (sert à la relance par inactivité). */
    toucher(): void;
}

export interface Plateau {
    element: HTMLElement;
    redimensionner(c: number): void;
    selectionner(k: string | undefined, legaux?: string[]): void;
    deplacer(de: string, vers: string): void;
    prendre(k: string): void;
    cueillir(k: string): void;
    /** Les cibles qui restent : toutes brillent, l'ordre est libre. */
    viser(restantes: string[]): void;
    secouer(k: string): void;
    eclairer(cases: string[]): void;
    inviter(): void;
    detruire(): void;
}

export function creerPlateau(s: Situation, c: number, rappels: Rappels): Plateau {
    const [cols, rangs] = s.taille;
    const el = document.createElement('div');
    el.className = 'plateau';
    el.setAttribute('role', 'grid');
    el.setAttribute('aria-label', 'Plateau');
    el.style.setProperty('--cols', String(cols));
    el.style.setProperty('--rangs', String(rangs));
    const pos = (k: string): { f: number; r: number } => { const [f = 0, r = 0] = k.split(',').map(Number); return { f, r: rangs - 1 - r }; };
    const placer = (n: HTMLElement, k: string): void => { const p = pos(k); n.style.setProperty('--f', String(p.f)); n.style.setProperty('--r', String(p.r)); };

    const cases = new Map<string, HTMLElement>();
    for (let r = rangs - 1; r >= 0; r--) {
        for (let f = 0; f < cols; f++) {
            const k = `${f},${r}`;
            const cell = document.createElement('div');
            cell.className = `case ${(f + r) % 2 === 0 ? 'fonce' : 'clair'}`;
            cell.dataset.case = k;
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', nomCase(k));
            placer(cell, k);
            el.append(cell);
            cases.set(k, cell);
        }
    }
    const couche = (cls: string, k: string, html: string, label?: string): HTMLElement => {
        const n = document.createElement('div');
        n.className = cls;
        n.dataset.case = k;
        if (label) n.setAttribute('aria-label', label);
        n.innerHTML = html;
        placer(n, k);
        el.append(n);
        return n;
    };
    for (const k of s.rochers) couche('rocher', k, rocherSvg(100), 'Rocher');
    const etoiles = new Map<string, HTMLElement>();
    const anneaux = new Map<string, HTMLElement>();
    for (const k of s.cibles) {
        if (s.pieces[k] === undefined) etoiles.set(k, couche('etoile', k, etoileSvg(100), 'Étoile'));
        else anneaux.set(k, couche('anneau', k, '', 'Cible'));
    }
    /** Toutes les cibles restantes brillent : elles s'attrapent dans n'importe quel ordre. */
    const viser = (restantes: string[]): void => {
        for (const [ck, n] of etoiles) n.classList.toggle('visee', restantes.includes(ck));
        for (const [ck, n] of anneaux) n.hidden = !restantes.includes(ck);
    };
    viser(s.cibles);
    const pieces = new Map<string, HTMLElement>();
    for (const [k, code] of Object.entries(s.pieces)) {
        const piece = { color: code.charAt(0) as Color, kind: code.charAt(1) as Kind };
        const n = couche(`piece ${piece.color === 'w' ? 'a-moi' : 'adverse'}`, k, pieceSvg(piece, 100), `${NOMS[piece.kind]} ${COULEURS[piece.color]}`);
        pieces.set(k, n);
    }
    const contour = document.createElement('div');
    contour.className = 'contour';
    contour.hidden = true;
    el.append(contour);

    let taille = c;
    let choisie: string | undefined;
    const redimensionner = (n: number): void => { taille = n; el.style.setProperty('--c', `${n}px`); };
    redimensionner(c);

    const caseSous = (x: number, y: number): string | undefined => {
        const rect = el.getBoundingClientRect();
        const f = Math.floor((x - rect.left) / taille), rh = Math.floor((y - rect.top) / taille);
        if (f < 0 || f >= cols || rh < 0 || rh >= rangs) return undefined;
        return `${f},${rangs - 1 - rh}`;
    };
    const aMoi = (k: string | undefined): k is string => k !== undefined && pieces.get(k)?.classList.contains('a-moi') === true;

    const selectionner = (k: string | undefined, legaux: string[] = []): void => {
        if (choisie !== undefined) pieces.get(choisie)?.classList.remove('choisie');
        choisie = k;
        if (k !== undefined) pieces.get(k)?.classList.add('choisie');
        for (const [ck, cell] of cases) cell.classList.toggle('legale', legaux.includes(ck));
    };

    // Geste en cours : un appui, qui devient un glisser s'il part d'une pièce à soi et bouge de 12 px.
    let geste: { pointer: number; x: number; y: number; depart: string | undefined; glisse: boolean; piece?: HTMLElement } | undefined;
    const fin = bindDragEnd(el.ownerDocument, () => geste?.glisse && geste.piece ? { pointer: geste.pointer, element: geste.piece, capture: el } : undefined,
        () => { geste = undefined; contour.hidden = true; }, () => { contour.hidden = true; });

    el.addEventListener('pointerdown', ev => {
        rappels.toucher();
        if (geste || !ev.isPrimary || !rappels.actif()) return;
        const k = caseSous(ev.clientX, ev.clientY);
        geste = { pointer: ev.pointerId, x: ev.clientX, y: ev.clientY, depart: k, glisse: false };
        if (aMoi(k)) {
            geste.piece = pieces.get(k);
            if (k !== choisie) rappels.choisie(k);
        }
        // Capture à chaque appui principal : le relâcher revient au plateau même hors de lui.
        try { el.setPointerCapture(ev.pointerId); } catch { /* Capture facultative (pointeur synthétique). */ }
        ev.preventDefault();
    });
    el.addEventListener('pointermove', ev => {
        if (!geste || geste.pointer !== ev.pointerId || !geste.piece) return;
        const dx = ev.clientX - geste.x, dy = ev.clientY - geste.y;
        if (!geste.glisse && Math.hypot(dx, dy) < SEUIL_GLISSER) return;
        if (!geste.glisse) { geste.glisse = true; geste.piece.classList.add('dragging'); fin.watch(); }
        geste.piece.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
        // La case exactement sous le doigt, jamais une voisine (pas d'aimant).
        const k = caseSous(ev.clientX, ev.clientY);
        contour.hidden = k === undefined;
        if (k !== undefined) placer(contour, k);
    });
    // Filet : tout geste se termine au relâcher ou à l'annulation, où qu'ils arrivent (après le traitement du plateau).
    const oublier = (ev: PointerEvent): void => { if (geste?.pointer === ev.pointerId) fin.finish(); };
    el.ownerDocument.addEventListener('pointerup', oublier);
    el.ownerDocument.addEventListener('pointercancel', oublier);
    el.addEventListener('pointerup', ev => {
        if (!geste || geste.pointer !== ev.pointerId) return;
        const g = geste;
        const k = caseSous(ev.clientX, ev.clientY);
        fin.finish();
        if (!rappels.actif()) return;
        if (g.glisse) {
            if (g.depart !== undefined && k !== undefined && k !== g.depart) rappels.coup(g.depart, k);
            return;
        }
        if (k === undefined || k !== g.depart || aMoi(k)) return;
        if (choisie !== undefined) rappels.coup(choisie, k);
        else inviter();
    });

    function inviter(): void {
        for (const n of pieces.values()) if (n.classList.contains('a-moi') && n.dataset.case !== undefined) rejouer(n, 'invite');
    }
    const rejouer = (n: HTMLElement, cls: string): void => { n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); };

    return {
        element: el,
        redimensionner,
        selectionner,
        deplacer(de, vers) {
            const n = pieces.get(de);
            if (!n) return;
            pieces.delete(de);
            pieces.set(vers, n);
            n.dataset.case = vers;
            placer(n, vers);
            if (choisie === de) choisie = vers;
        },
        prendre(k) {
            const n = pieces.get(k);
            if (!n) return;
            pieces.delete(k);
            n.classList.add('prise');
            setTimeout(() => n.remove(), 320);
        },
        cueillir(k) {
            const n = etoiles.get(k);
            if (!n) return;
            etoiles.delete(k);
            n.classList.add('cueillie');
            setTimeout(() => n.remove(), 320);
        },
        viser,
        secouer(k) { const n = pieces.get(k); if (n) rejouer(n, 'secoue'); },
        eclairer(liste) { for (const [ck, cell] of cases) cell.classList.toggle('trajet', liste.includes(ck)); },
        inviter,
        detruire() {
            el.ownerDocument.removeEventListener('pointerup', oublier);
            el.ownerDocument.removeEventListener('pointercancel', oublier);
            fin.dispose();
            el.remove();
        }
    };
}
