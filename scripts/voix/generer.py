#!/usr/bin/env python3
"""Pré-génère les consignes vocales avec une voix LOCALE (Piper), au moment de la construction du contenu.

Adapté d'Opencadkid (scripts/dictee/generer_audio.py). Rien n'est appelé pendant le jeu : les fichiers .ogg
(Opus, mono, 24 kbit/s) sont livrés avec la page et jouent hors ligne. Un fichier n'est refait que si son texte ou
les réglages de voix ont changé (empreintes dans `scripts/voix/empreintes.json`).

Outils, versions figées :
- piper-tts 1.8.0 (pip), voix fr_FR-siwis-medium (jeu de données SIWIS, licence CC BY 4.0) :
  https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium
  empreinte sha256 du modèle b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef
- ffmpeg avec libopus.

Usage :
    ~/piper/venv/bin/python scripts/voix/generer.py --modele ~/piper/voices/fr_FR-siwis-medium.onnx

Piper tire un peu de bruit à chaque synthèse : deux passes donnent des fichiers voisins, pas identiques à l'octet.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
import wave
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
PHRASES = RACINE / 'public/voix/phrases.json'
SORTIE = RACINE / 'public/voix'
EMPREINTES = RACINE / 'scripts/voix/empreintes.json'
MODELE_SHA256 = 'b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef'
REGLAGES = {'length_scale': 1.05}
OPUS = ['-c:a', 'libopus', '-b:a', '24k', '-ac', '1', '-ar', '24000', '-map_metadata', '-1', '-fflags', '+bitexact']


def empreinte(texte: str) -> str:
    return hashlib.sha256(json.dumps([texte, MODELE_SHA256, REGLAGES, OPUS], ensure_ascii=False).encode()).hexdigest()[:16]


def main() -> None:
    from piper import PiperVoice, SynthesisConfig  # noqa: PLC0415 — installé seulement là où l'on génère

    p = argparse.ArgumentParser()
    p.add_argument('--modele', type=Path, required=True)
    p.add_argument('--phrases', type=Path, default=PHRASES)
    a = p.parse_args()
    vu = hashlib.sha256(a.modele.read_bytes()).hexdigest()
    if vu != MODELE_SHA256:
        raise SystemExit(f'modèle inattendu : {vu}')
    voix = PiperVoice.load(str(a.modele))
    phrases: dict[str, str] = json.loads(a.phrases.read_text(encoding='utf-8'))
    connues = json.loads(EMPREINTES.read_text(encoding='utf-8')) if EMPREINTES.exists() else {}
    faits = 0
    with tempfile.TemporaryDirectory() as tmp:
        for ident, texte in phrases.items():
            cible, cle = SORTIE / f'{ident}.ogg', empreinte(texte)
            if cible.exists() and connues.get(ident) == cle:
                continue
            wav = Path(tmp) / 'a.wav'
            with wave.open(str(wav), 'wb') as f:
                voix.synthesize_wav(texte, f, syn_config=SynthesisConfig(**REGLAGES))
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), *OPUS, str(cible)], check=True)
            connues[ident] = cle
            faits += 1
    # Les fichiers qui ne correspondent plus à aucune phrase sont retirés.
    for f in SORTIE.glob('*.ogg'):
        if f.stem not in phrases:
            f.unlink()
            connues.pop(f.stem, None)
    EMPREINTES.write_text(json.dumps(dict(sorted((k, v) for k, v in connues.items() if k in phrases)), indent=0) + '\n', encoding='utf-8')
    print(f'{faits} fichiers générés, {len(phrases)} attendus')


if __name__ == '__main__':
    main()
