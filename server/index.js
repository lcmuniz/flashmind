import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(cors());
app.use(express.json());

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ---

app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await query(
            'INSERT INTO flashmind.users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: "Email já existe" });
        console.error(err);
        res.status(500).json({ error: "Erro interno" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await query('SELECT * FROM flashmind.users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro interno" });
    }
});

// --- DECKS ---

app.get('/api/decks', authenticateToken, async (req, res) => {
    try {
        const result = await query('SELECT * FROM flashmind.decks WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro");
    }
});

app.post('/api/decks', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const result = await query(
            'INSERT INTO flashmind.decks (user_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.id, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro");
    }
});

app.delete('/api/decks/:id', authenticateToken, async (req, res) => {
    try {
        // Verifica propriedade
        const check = await query('SELECT user_id FROM flashmind.decks WHERE id = $1', [req.params.id]);
        if (check.rows.length === 0) return res.status(404).send("Deck não encontrado");
        if (check.rows[0].user_id !== req.user.id) return res.status(403).send("Proibido");

        await query('DELETE FROM flashmind.decks WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro");
    }
});

// --- CARDS ---

app.get('/api/decks/:deckId/cards', authenticateToken, async (req, res) => {
    try {
        // Verifica acesso ao deck
        const deckCheck = await query('SELECT user_id FROM flashmind.decks WHERE id = $1', [req.params.deckId]);
        if (deckCheck.rows.length === 0 || deckCheck.rows[0].user_id !== req.user.id) {
            return res.status(403).send("Acesso negado ao Deck");
        }

        const result = await query('SELECT * FROM flashmind.cards WHERE deck_id = $1 ORDER BY created_at', [req.params.deckId]);
        // Mapeia snake_case para camelCase para o frontend
        const cards = result.rows.map(row => ({
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
        }));
        res.json(cards);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro");
    }
});

app.post('/api/cards', authenticateToken, async (req, res) => {
    const { deckId, front, back, mediaType, mediaUrl, state, interval, ease_factor, repetitions, learningStepIndex, nextReviewDate } = req.body;

    // Verifica deck owner
    const deckCheck = await query('SELECT user_id FROM flashmind.decks WHERE id = $1', [deckId]);
    if (deckCheck.rows.length === 0 || deckCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).send("Acesso negado");
    }

    try {
        const result = await query(
            `INSERT INTO flashmind.cards (deck_id, front, back, media_type, media_url, state, interval_days, ease_factor, repetitions, learning_step_index, next_review_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [deckId, front, back, mediaType, mediaUrl, state, interval, ease_factor, repetitions, learningStepIndex, nextReviewDate]
        );
        const row = result.rows[0];
        // Retorna camelCase
        res.json({
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
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro");
    }
});

app.put('/api/cards/:id', authenticateToken, async (req, res) => {
    const { state, learningStepIndex, interval, ease_factor, repetitions, nextReviewDate } = req.body;
    const cardId = req.params.id;

    // Verifica owner via JOIN
    const checkOwner = await query(
        `SELECT d.user_id FROM flashmind.cards c JOIN flashmind.decks d ON c.deck_id = d.id WHERE c.id = $1`,
        [cardId]
    );
    if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== req.user.id) {
        return res.status(403).send("Acesso negado");
    }

    try {
        const result = await query(
            `UPDATE flashmind.cards SET 
         state = $1, learning_step_index = $2, interval_days = $3, ease_factor = $4, repetitions = $5, next_review_date = $6
       WHERE id = $7 RETURNING *`,
            [state, learningStepIndex, interval, ease_factor, repetitions, nextReviewDate, cardId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro");
    }
});

app.delete('/api/cards/:id', authenticateToken, async (req, res) => {
    const cardId = req.params.id;
    const checkOwner = await query(
        `SELECT d.user_id FROM flashmind.cards c JOIN flashmind.decks d ON c.deck_id = d.id WHERE c.id = $1`,
        [cardId]
    );
    if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== req.user.id) {
        return res.status(403).send("Acesso negado");
    }

    await query('DELETE FROM flashmind.cards WHERE id = $1', [cardId]);
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
