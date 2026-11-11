// Minimal in-memory stand-in for the pg `query` function, enough to exercise the API routes.
export function createFakeDb() {
    const users = [];
    const decks = [];
    const cards = [];
    let nextId = 1;

    const assertInt = (value) => {
        if (!Number.isInteger(Number(value))) {
            const err = new Error(`invalid input syntax for type integer: "${value}"`);
            err.code = '22P02';
            throw err;
        }
        return Number(value);
    };

    const query = async (text, params = []) => {
        const sql = text.replace(/\s+/g, ' ').trim();

        if (sql.startsWith('INSERT INTO flashmind.users')) {
            const [email, hash] = params;
            if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
                const err = new Error('duplicate key');
                err.code = '23505';
                throw err;
            }
            const user = { id: nextId++, email, password_hash: hash };
            users.push(user);
            return { rows: [{ id: user.id, email: user.email }] };
        }
        if (sql.startsWith('SELECT id, email, password_hash FROM flashmind.users')) {
            return { rows: users.filter((u) => u.email.toLowerCase() === params[0].toLowerCase()) };
        }
        if (sql.startsWith('SELECT * FROM flashmind.decks WHERE user_id')) {
            return { rows: decks.filter((d) => d.user_id === params[0]) };
        }
        if (sql.startsWith('INSERT INTO flashmind.decks')) {
            const deck = { id: nextId++, user_id: params[0], name: params[1], created_at: new Date() };
            decks.push(deck);
            return { rows: [deck] };
        }
        if (sql.startsWith('SELECT user_id FROM flashmind.decks WHERE id')) {
            const id = assertInt(params[0]);
            return { rows: decks.filter((d) => d.id === id).map((d) => ({ user_id: d.user_id })) };
        }
        if (sql.startsWith('DELETE FROM flashmind.decks')) {
            const i = decks.findIndex((d) => d.id === params[0]);
            if (i >= 0) decks.splice(i, 1);
            return { rows: [] };
        }
        if (sql.startsWith('SELECT * FROM flashmind.cards WHERE deck_id')) {
            return { rows: cards.filter((c) => c.deck_id === params[0]) };
        }
        if (sql.startsWith('INSERT INTO flashmind.cards')) {
            const [deck_id, front, back, media_type, media_url, state, interval_days, ease_factor, repetitions, learning_step_index, next_review_date] = params;
            const card = {
                id: nextId++, deck_id, front, back,
                media_type: media_type ?? 'text', media_url, state: state ?? 'NOVO',
                interval_days: interval_days ?? 0, ease_factor: ease_factor ?? 2.5, repetitions: repetitions ?? 0,
                learning_step_index: learning_step_index ?? 0, next_review_date: next_review_date ?? new Date().toISOString()
            };
            cards.push(card);
            return { rows: [card] };
        }
        if (sql.startsWith('SELECT d.user_id FROM flashmind.cards')) {
            const id = assertInt(params[0]);
            const card = cards.find((c) => c.id === id);
            const deck = card && decks.find((d) => d.id === card.deck_id);
            return { rows: deck ? [{ user_id: deck.user_id }] : [] };
        }
        if (sql.startsWith('UPDATE flashmind.cards')) {
            const card = cards.find((c) => c.id === params[10]);
            const cols = ['state', 'learning_step_index', 'interval_days', 'ease_factor', 'repetitions', 'next_review_date', 'front', 'back', 'media_type', 'media_url'];
            cols.forEach((col, i) => { if (params[i] !== null) card[col] = params[i]; });
            return { rows: [card] };
        }
        if (sql.startsWith('DELETE FROM flashmind.cards')) {
            const i = cards.findIndex((c) => c.id === params[0]);
            if (i >= 0) cards.splice(i, 1);
            return { rows: [] };
        }
        throw new Error(`Unexpected query in fake DB: ${sql}`);
    };

    return { query, users, decks, cards };
}
