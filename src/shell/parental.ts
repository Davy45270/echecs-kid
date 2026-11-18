// Repris d'Opencadkid (src/shell/parental.ts), avec le générateur Mulberry32 de src/engines/rng.ts intégré.
function makeRng(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
        value = (value + 1831565813) | 0;
        let n = Math.imul(value ^ value >>> 15, 1 | value);
        n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
        return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
}
function shuffle<T>(values: readonly T[], rng: () => number): T[] {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
}
export function parentalQuestion(seed: number): { a: number; b: number; choices: number[]; answer: number } {
    const rng = makeRng(seed);
    const a = 3 + Math.floor(rng() * 7), b = 3 + Math.floor(rng() * 7);
    const answer = a * b;
    return { a, b, answer, choices: shuffle([answer, answer + a, answer - b], rng) };
}
export function checkParental(question: ReturnType<typeof parentalQuestion>, choice: number): boolean { return question.answer === choice; }
