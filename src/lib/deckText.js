// Plain-text import/export format:
//
// Deck: Deck name
// P: Question
// R: Answer
// ---

/**
 * @param {{name: string, cards: {front: string, back: string}[]}[]} decks
 * @returns {string}
 */
export function formatDecks(decks) {
    return decks
        .map(({ name, cards }) => {
            const lines = [`Deck: ${name}`];
            for (const card of cards) lines.push(`P: ${card.front}`, `R: ${card.back}`);
            return lines.join('\n') + '\n---\n';
        })
        .join('');
}

/**
 * Parses the plain-text format. Blocks without a deck name or without complete
 * question/answer pairs are skipped.
 * @param {string} text
 * @returns {{name: string, cards: {front: string, back: string}[]}[]}
 */
export function parseDecks(text) {
    return text
        .split('---')
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => {
            let name = '';
            let question = '';
            const cards = [];
            for (const line of block.split('\n')) {
                const trimmed = line.trim();
                if (trimmed.startsWith('Deck:')) name = trimmed.slice(5).trim();
                else if (trimmed.startsWith('P:')) question = trimmed.slice(2).trim();
                else if (trimmed.startsWith('R:')) {
                    const answer = trimmed.slice(2).trim();
                    if (question && answer) {
                        cards.push({ front: question, back: answer });
                        question = '';
                    }
                }
            }
            return { name, cards };
        })
        .filter((deck) => deck.name && deck.cards.length > 0);
}
