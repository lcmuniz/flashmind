import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'schema.sql');

const initDb = async () => {
    try {
        console.log("Lendo arquivo de schema...");
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log("Executando query de inicialização...");
        await query(schemaSql);

        console.log("DB Inicializado com sucesso (Schema criado).");
        process.exit(0);
    } catch (err) {
        console.error("Erro ao inicializar DB:", err);
        process.exit(1);
    }
};

initDb();
