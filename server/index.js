import dotenv from 'dotenv';
import { createApp } from './app.js';
import { query } from './db.js';

dotenv.config();

const port = process.env.PORT || 3000;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

let app;
try {
    app = createApp({
        query,
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
        corsOrigins
    });
} catch (err) {
    console.error(`Configuração inválida: ${err.message}`);
    process.exit(1);
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
