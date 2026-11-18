// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { go } from '../src/shell/router';
import { parentalQuestion } from '../src/shell/parental';
import { readSave, browserStorage, writeSave, fresh } from '../src/shell/storage';
import { resetActivations } from '../src/shell/activation';

const app = (): HTMLElement => document.getElementById('app')!;
const click = (sel: string): void => { (app().querySelector(sel) as HTMLElement).click(); };
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(1_000_000); resetActivations();
    localStorage.clear(); document.body.innerHTML = '<main id="app"></main>';
});
afterEach(() => vi.useRealTimers());

function ouvrirGate(): ReturnType<typeof parentalQuestion> {
    go('accueil'); click('#parent'); expect(app().dataset.screen).toBe('parent');
    return parentalQuestion(Date.now() % 100000);
}

it('right answer opens settings; erasing keeps the volume and empties progress', () => {
    writeSave(browserStorage(), { ...fresh(), progress: { seule: { 'tour.train.1': 1 }, aidee: {}, courante: { tour: 2 } } });
    const q = ouvrirGate();
    expect(app().querySelector('#volume')).toBeNull();
    click(`[data-choix="${q.answer}"]`);
    const slider = app().querySelector<HTMLInputElement>('#volume')!;
    expect(slider).not.toBeNull();
    slider.value = '50'; slider.dispatchEvent(new Event('input'));
    expect(readSave(browserStorage()).volume).toBe(0.5);
    click('#effacer'); click('#oui');
    const save = readSave(browserStorage());
    expect(save.volume).toBe(0.5);
    expect(save.progress).toEqual({ seule: {}, aidee: {}, courante: {} });
});

it('wrong answer shows no slider and locks the parent button for 5 s', () => {
    const q = ouvrirGate();
    const faux = q.choices.find(n => n !== q.answer)!;
    click(`[data-choix="${faux}"]`);
    expect(app().dataset.screen).toBe('accueil'); expect(app().querySelector('#volume')).toBeNull();
    click('#parent'); expect(app().dataset.screen).toBe('accueil');
    vi.advanceTimersByTime(4900); click('#parent'); expect(app().dataset.screen).toBe('accueil');
    vi.advanceTimersByTime(200); click('#parent'); expect(app().dataset.screen).toBe('parent');
});
