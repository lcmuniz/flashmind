import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores bytes beyond 72

const toCard = (row) => ({
    id: row.id,
    front: row.front,
    back: row.back,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    state: row.state,
    learningStepIndex: row.learning_step_index,
    interval: row.interval_days,
    ease_factor: row.ease_factor,
    repetitions: row.repetitions,
    nextReviewDate: row.next_review_date
});

const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
};

// Wraps async handlers so rejected promises reach the error handler
// instead of crashing the process (Express 4 does not do this by itself).
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Builds the Express app. Dependencies are injected so tests can run without a real database.
 * @param {object} deps
 * @param {(text: string, params?: unknown[]) => Promise<{rows: any[]}>} deps.query
 * @param {string} deps.jwtSecret
 * @param {string} [deps.jwtExpiresIn]
 * @param {string[]} [deps.corsOrigins]
 * @param {number} [deps.authRateLimit] max auth requests per IP per 15 minutes
 */
export function createApp({ query, jwtSecret, jwtExpiresIn = '7d', corsOrigins = [], authRateLimit = 20 }) {
    if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be set and have at least 32 characters');
    }

    const app = express();
    app.disable('x-powered-by');
    app.use(cors({ origin: corsOrigins }));
    app.use(express.json({ limit: '100kb' }));

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: authRateLimit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
    });

    const signToken = (user) => jwt.sign({ id: user.id, email: user.email }, jwtSecret, {
        expiresIn: jwtExpiresIn,
        algorithm: 'HS256'
    });

    const authenticateToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.sendStatus(401);

        jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }, (err, user) => {
            if (err) return res.sendStatus(401);
            req.user = user;
            next();
        });
    };

    const ownsDeck = async (deckId, userId) => {
        const result = await query('SELECT user_id FROM flashmind.decks WHERE id = $1', [deckId]);
        return result.rows.length > 0 && result.rows[0].user_id === userId;
    };

    const ownsCard = async (cardId, userId) => {
        const result = await query(
            'SELECT d.user_id FROM flashmind.cards c JOIN flashmind.decks d ON c.deck_id = d.id WHERE c.id = $1',
            [cardId]
        );
        return result.rows.length > 0 && result.rows[0].user_id === userId;
    };

    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    // --- AUTH ---

    app.post('/api/auth/register', authLimiter, asyncHandler(async (req, res) => {
        const { email, password } = req.body ?? {};
        if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'E-mail inválido' });
        }
        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({ error: `A senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            const result = await query(
                'INSERT INTO flashmind.users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
                [email.toLowerCase(), hashedPassword]
            );
            const user = result.rows[0];
            res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email } });
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ error: 'E-mail já cadastrado' });
            throw err;
        }
    }));

    app.post('/api/auth/login', authLimiter, asyncHandler(async (req, res) => {
        const { email, password } = req.body ?? {};
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const result = await query('SELECT id, email, password_hash FROM flashmind.users WHERE lower(email) = lower($1)', [email]);
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
    }));

    // --- DECKS ---

    app.get('/api/decks', authenticateToken, asyncHandler(async (req, res) => {
        const result = await query('SELECT * FROM flashmind.decks WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    }));

    app.post('/api/decks', authenticateToken, asyncHandler(async (req, res) => {
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        if (!name || name.length > 255) return res.status(400).json({ error: 'Nome inválido' });

        const result = await query(
            'INSERT INTO flashmind.decks (user_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.id, name]
        );
        res.status(201).json(result.rows[0]);
    }));

    app.delete('/api/decks/:id', authenticateToken, asyncHandler(async (req, res) => {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Id inválido' });

        const check = await query('SELECT user_id FROM flashmind.decks WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Deck não encontrado' });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Proibido' });

        await query('DELETE FROM flashmind.decks WHERE id = $1', [id]);
        res.json({ success: true });
    }));

    // --- CARDS ---

    app.get('/api/decks/:deckId/cards', authenticateToken, asyncHandler(async (req, res) => {
        const deckId = parseId(req.params.deckId);
        if (!deckId) return res.status(400).json({ error: 'Id inválido' });
        if (!(await ownsDeck(deckId, req.user.id))) return res.status(403).json({ error: 'Acesso negado ao deck' });

        const result = await query('SELECT * FROM flashmind.cards WHERE deck_id = $1 ORDER BY created_at', [deckId]);
        res.json(result.rows.map(toCard));
    }));

    app.post('/api/cards', authenticateToken, asyncHandler(async (req, res) => {
        const { front, back, mediaType, mediaUrl, state, interval, ease_factor, repetitions, learningStepIndex, nextReviewDate } = req.body ?? {};
        const deckId = parseId(req.body?.deckId);
        if (!deckId) return res.status(400).json({ error: 'Id inválido' });
        if (typeof front !== 'string' || typeof back !== 'string' || !front.trim() || !back.trim()) {
            return res.status(400).json({ error: 'Frente e verso são obrigatórios' });
        }
        if (!(await ownsDeck(deckId, req.user.id))) return res.status(403).json({ error: 'Acesso negado' });

        const result = await query(
            `INSERT INTO flashmind.cards (deck_id, front, back, media_type, media_url, state, interval_days, ease_factor, repetitions, learning_step_index, next_review_date)
       VALUES ($1, $2, $3, COALESCE($4::varchar, 'text'), $5, COALESCE($6::varchar, 'NOVO'), COALESCE($7::real, 0), COALESCE($8::real, 2.5), COALESCE($9::int, 0), COALESCE($10::int, 0), COALESCE($11::timestamptz, CURRENT_TIMESTAMP)) RETURNING *`,
            [deckId, front, back, mediaType ?? null, mediaUrl ?? null, state ?? null, interval ?? null, ease_factor ?? null, repetitions ?? null, learningStepIndex ?? null, nextReviewDate ?? null]
        );
        res.status(201).json(toCard(result.rows[0]));
    }));

    app.put('/api/cards/:id', authenticateToken, asyncHandler(async (req, res) => {
        const cardId = parseId(req.params.id);
        if (!cardId) return res.status(400).json({ error: 'Id inválido' });
        if (!(await ownsCard(cardId, req.user.id))) return res.status(403).json({ error: 'Acesso negado' });

        const { state, learningStepIndex, interval, ease_factor, repetitions, nextReviewDate, front, back, mediaType, mediaUrl } = req.body ?? {};
        // COALESCE allows partial updates: review answers send scheduling fields, edits send content fields.
        const result = await query(
            `UPDATE flashmind.cards SET
         state = COALESCE($1, state),
         learning_step_index = COALESCE($2, learning_step_index),
         interval_days = COALESCE($3, interval_days),
         ease_factor = COALESCE($4, ease_factor),
         repetitions = COALESCE($5, repetitions),
         next_review_date = COALESCE($6, next_review_date),
         front = COALESCE($7, front),
         back = COALESCE($8, back),
         media_type = COALESCE($9, media_type),
         media_url = COALESCE($10, media_url)
       WHERE id = $11 RETURNING *`,
            [state ?? null, learningStepIndex ?? null, interval ?? null, ease_factor ?? null, repetitions ?? null, nextReviewDate ?? null,
                front ?? null, back ?? null, mediaType ?? null, mediaUrl ?? null, cardId]
        );
        res.json(toCard(result.rows[0]));
    }));

    app.delete('/api/cards/:id', authenticateToken, asyncHandler(async (req, res) => {
        const cardId = parseId(req.params.id);
        if (!cardId) return res.status(400).json({ error: 'Id inválido' });
        if (!(await ownsCard(cardId, req.user.id))) return res.status(403).json({ error: 'Acesso negado' });

        await query('DELETE FROM flashmind.cards WHERE id = $1', [cardId]);
        res.json({ success: true });
    }));

    // Central error handler: logs the error, never leaks details to the client.
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
        if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Requisição muito grande' });
        console.error(err);
        res.status(500).json({ error: 'Erro interno' });
    });

    return app;
}
