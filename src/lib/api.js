const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

// Throws on non-2xx responses. 401/403 become an 'auth' error so the app can log out
// (e.g. when the JWT has expired).
const request = async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, { headers: getHeaders(), ...options });
    if (res.status === 401 || res.status === 403) throw new Error('auth');
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
    }
    return res.json();
};

const authRequest = async (path, email, password, fallbackMessage) => {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || fallbackMessage);
    }
    return res.json();
};

export const api = {
    auth: {
        login: (email, password) => authRequest('/auth/login', email, password, 'Falha no login'),
        register: (email, password) => authRequest('/auth/register', email, password, 'Falha no registro')
    },
    decks: {
        list: () => request('/decks'),
        create: (name) => request('/decks', { method: 'POST', body: JSON.stringify({ name }) }),
        delete: (id) => request(`/decks/${id}`, { method: 'DELETE' })
    },
    cards: {
        list: (deckId) => request(`/decks/${deckId}/cards`),
        create: (cardData) => request('/cards', { method: 'POST', body: JSON.stringify(cardData) }),
        update: (id, data) => request(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => request(`/cards/${id}`, { method: 'DELETE' })
    }
};
