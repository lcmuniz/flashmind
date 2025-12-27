const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const api = {
    auth: {
        login: async (email, password) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) throw new Error('Falha no login');
            return res.json();
        },
        register: async (email, password) => {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) throw new Error('Falha no registro');
            return res.json();
        }
    },
    decks: {
        list: async () => {
            const res = await fetch(`${API_URL}/decks`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Erro ao buscar decks');
            return res.json();
        },
        create: async (name) => {
            const res = await fetch(`${API_URL}/decks`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name })
            });
            return res.json();
        },
        delete: async (id) => {
            await fetch(`${API_URL}/decks/${id}`, { method: 'DELETE', headers: getHeaders() });
        }
    },
    cards: {
        list: async (deckId) => {
            const res = await fetch(`${API_URL}/decks/${deckId}/cards`, { headers: getHeaders() });
            return res.json();
        },
        create: async (cardData) => {
            const res = await fetch(`${API_URL}/cards`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(cardData)
            });
            return res.json();
        },
        update: async (id, data) => {
            await fetch(`${API_URL}/cards/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
        },
        delete: async (id) => {
            await fetch(`${API_URL}/cards/${id}`, { method: 'DELETE', headers: getHeaders() });
        }
    }
};
