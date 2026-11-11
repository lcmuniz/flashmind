import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app.js';
import { createFakeDb } from './fakeDb.js';

const SECRET = 'test-secret-with-at-least-32-characters!!';

let db;
let app;

const register = async (email = 'ana@example.com', password = 'senha-forte-123') => {
    const res = await request(app).post('/api/auth/register').send({ email, password });
    assert.equal(res.status, 201);
    return res.body.token;
};

beforeEach(() => {
    db = createFakeDb();
    app = createApp({ query: db.query, jwtSecret: SECRET, authRateLimit: 1000 });
});

describe('configuration', () => {
    it('refuses to start without a strong JWT secret', () => {
        assert.throws(() => createApp({ query: db.query, jwtSecret: undefined }), /JWT_SECRET/);
        assert.throws(() => createApp({ query: db.query, jwtSecret: 'your_jwt_secret' }), /JWT_SECRET/);
    });
});

describe('auth', () => {
    it('registers, stores a bcrypt hash and returns an expiring token', async () => {
        const token = await register();
        assert.notEqual(db.users[0].password_hash, 'senha-forte-123');
        const payload = jwt.verify(token, SECRET);
        assert.ok(payload.exp > payload.iat, 'token must expire');
    });

    it('rejects weak passwords and invalid e-mails', async () => {
        const weak = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: '123' });
        assert.equal(weak.status, 400);
        const badEmail = await request(app).post('/api/auth/register').send({ email: 'nao-e-email', password: 'senha-forte-123' });
        assert.equal(badEmail.status, 400);
    });

    it('rejects duplicate e-mails regardless of case', async () => {
        await register('ana@example.com');
        const res = await request(app).post('/api/auth/register').send({ email: 'ANA@example.com', password: 'senha-forte-123' });
        assert.equal(res.status, 409);
    });

    it('logs in with correct credentials only', async () => {
        await register();
        const ok = await request(app).post('/api/auth/login').send({ email: 'Ana@Example.com', password: 'senha-forte-123' });
        assert.equal(ok.status, 200);
        assert.ok(ok.body.token);
        const wrong = await request(app).post('/api/auth/login').send({ email: 'ana@example.com', password: 'errada-123' });
        assert.equal(wrong.status, 401);
    });

    it('rate-limits repeated login attempts', async () => {
        const limited = createApp({ query: db.query, jwtSecret: SECRET, authRateLimit: 3 });
        for (let i = 0; i < 3; i++) {
            await request(limited).post('/api/auth/login').send({ email: 'x@y.com', password: 'qualquer-coisa' });
        }
        const res = await request(limited).post('/api/auth/login').send({ email: 'x@y.com', password: 'qualquer-coisa' });
        assert.equal(res.status, 429);
    });

    it('rejects missing, forged and expired tokens', async () => {
        assert.equal((await request(app).get('/api/decks')).status, 401);
        const forged = jwt.sign({ id: 1, email: 'x@y.com' }, 'your_jwt_secret');
        assert.equal((await request(app).get('/api/decks').set('Authorization', `Bearer ${forged}`)).status, 401);
        const expired = jwt.sign({ id: 1, email: 'x@y.com' }, SECRET, { expiresIn: -10 });
        assert.equal((await request(app).get('/api/decks').set('Authorization', `Bearer ${expired}`)).status, 401);
    });
});

describe('decks and cards', () => {
    it('creates a deck and a card, then lists them', async () => {
        const token = await register();
        const auth = { Authorization: `Bearer ${token}` };
        const deck = await request(app).post('/api/decks').set(auth).send({ name: 'Inglês' });
        assert.equal(deck.status, 201);

        const card = await request(app).post('/api/cards').set(auth).send({ deckId: deck.body.id, front: 'dog', back: 'cachorro' });
        assert.equal(card.status, 201);
        assert.equal(card.body.state, 'NOVO');

        const list = await request(app).get(`/api/decks/${deck.body.id}/cards`).set(auth);
        assert.equal(list.status, 200);
        assert.equal(list.body.length, 1);
        assert.equal(list.body[0].front, 'dog');
    });

    it('does not let a user read or change another user\'s data', async () => {
        const ana = { Authorization: `Bearer ${await register('ana@example.com')}` };
        const bia = { Authorization: `Bearer ${await register('bia@example.com')}` };
        const deck = await request(app).post('/api/decks').set(ana).send({ name: 'Privado' });
        const card = await request(app).post('/api/cards').set(ana).send({ deckId: deck.body.id, front: 'a', back: 'b' });

        assert.equal((await request(app).get(`/api/decks/${deck.body.id}/cards`).set(bia)).status, 403);
        assert.equal((await request(app).post('/api/cards').set(bia).send({ deckId: deck.body.id, front: 'x', back: 'y' })).status, 403);
        assert.equal((await request(app).put(`/api/cards/${card.body.id}`).set(bia).send({ front: 'hack' })).status, 403);
        assert.equal((await request(app).delete(`/api/cards/${card.body.id}`).set(bia)).status, 403);
        assert.equal((await request(app).delete(`/api/decks/${deck.body.id}`).set(bia)).status, 403);
        assert.equal(db.cards[0].front, 'a');
    });

    it('answers 400 (instead of crashing) for non-numeric ids', async () => {
        const auth = { Authorization: `Bearer ${await register()}` };
        assert.equal((await request(app).put('/api/cards/abc').set(auth).send({ front: 'x' })).status, 400);
        assert.equal((await request(app).delete('/api/cards/abc').set(auth)).status, 400);
        assert.equal((await request(app).post('/api/cards').set(auth).send({ deckId: 'abc', front: 'x', back: 'y' })).status, 400);
        assert.equal((await request(app).get('/api/decks/abc/cards').set(auth)).status, 400);
        // server is still alive
        assert.equal((await request(app).get('/api/health')).status, 200);
    });

    it('returns a generic 500 when the database fails', async () => {
        const failing = createApp({
            query: async () => { throw new Error('connection refused to 10.0.0.1'); },
            jwtSecret: SECRET
        });
        const token = jwt.sign({ id: 1, email: 'x@y.com' }, SECRET);
        const originalError = console.error;
        console.error = () => {};
        try {
            const res = await request(failing).get('/api/decks').set('Authorization', `Bearer ${token}`);
            assert.equal(res.status, 500);
            assert.deepEqual(res.body, { error: 'Erro interno' });
        } finally {
            console.error = originalError;
        }
    });

    it('rejects malformed JSON with 400', async () => {
        const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
        assert.equal(res.status, 400);
    });
});
