import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDecks, parseDecks } from '../src/lib/deckText.js';

describe('deck text format', () => {
    const decks = [
        { name: 'Inglês', cards: [{ front: 'dog', back: 'cachorro' }, { front: 'cat', back: 'gato' }] },
        { name: 'Capitais', cards: [{ front: 'França', back: 'Paris' }] }
    ];

    it('round-trips export and import', () => {
        assert.deepEqual(parseDecks(formatDecks(decks)), decks);
    });

    it('uses the documented P:/R: format', () => {
        assert.equal(formatDecks([decks[1]]), 'Deck: Capitais\nP: França\nR: Paris\n---\n');
    });

    it('skips incomplete blocks and unpaired lines', () => {
        const text = 'P: sem deck\nR: ignorado\n---\nDeck: Vazio\n---\nDeck: Ok\nP: pergunta\nP: outra\nR: resposta\nR: sem pergunta\n';
        assert.deepEqual(parseDecks(text), [{ name: 'Ok', cards: [{ front: 'outra', back: 'resposta' }] }]);
    });
});
