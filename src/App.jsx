import React, { useState, useEffect, useCallback } from 'react';
import { CARD_STATES } from './lib/constants';
import { api } from './lib/api';
import { scheduleReview } from './lib/scheduler';

import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import DeckView from './components/DeckView';
import StudySession from './components/StudySession';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState(() => localStorage.getItem('token') ? 'dashboard' : 'login');
  const [decks, setDecks] = useState([]);
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [cards, setCards] = useState([]);
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setUser(null);
    setView('login');
  }, []);

  const handleLoadError = useCallback((err) => {
    console.error(err);
    if (err.message.includes('auth')) handleLogout();
  }, [handleLogout]);

  // Carregar decks ao entrar no dashboard
  useEffect(() => {
    if (view === 'dashboard' && user) {
      api.decks.list().then(setDecks).catch(handleLoadError);
    }
  }, [view, user, handleLoadError]);

  // Carregar cards ao selecionar deck
  useEffect(() => {
    if (currentDeckId) {
      api.cards.list(currentDeckId).then(setCards).catch(handleLoadError);
    }
  }, [currentDeckId, handleLoadError]);

  const handleReviewAnswer = async (card, answer) => {
    const updatedCard = scheduleReview(card, answer);

    // Otimista
    setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));
    await api.cards.update(card.id, updatedCard);
  };

  const createDeck = async (name) => {
    if (!name.trim()) return;
    try {
      const newDeck = await api.decks.create(name);
      setDecks(prev => [newDeck, ...prev]);
      return newDeck.id;
    } catch (e) { console.error(e); }
  };

  const addCardToDeck = async (deckId, front, back, mediaType = 'text', mediaUrl = '') => {
    const newCardData = {
      deckId,
      front,
      back,
      mediaType,
      mediaUrl: mediaUrl || '',
      state: CARD_STATES.NEW,
      interval: 0,
      ease_factor: 2.5,
      repetitions: 0,
      learningStepIndex: 0,
      nextReviewDate: new Date().toISOString()
    };

    try {
      const created = await api.cards.create(newCardData);
      setCards(prev => [...prev, created]);
    } catch (e) { console.error(e); }
  };

  const handleLogin = (authData) => {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user_data', JSON.stringify(authData.user));
    setUser(authData.user);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 overflow-x-hidden">
      {view === 'login' && <LoginScreen onLogin={handleLogin} />}

      {view === 'dashboard' && (
        <Dashboard
          decks={decks}
          user={user}
          onLogout={handleLogout}
          onSelectDeck={(id) => { setCurrentDeckId(id); setView('deck-view'); }}
          onCreateDeck={createDeck}
          onDeleteDeck={async (id) => {
            await api.decks.delete(id);
            setDecks(prev => prev.filter(d => d.id !== id));
          }}
        />
      )}

      {view === 'deck-view' && (
        <DeckView
          deck={decks.find(d => d.id === currentDeckId)}
          cards={cards}
          onBack={() => setView('dashboard')}
          onStudy={() => setView('study')}
          onAddCard={(f, b, t, u) => addCardToDeck(currentDeckId, f, b, t, u)}
          onEditCard={async (id, f, b, t, u) => {
            const card = cards.find(c => c.id === id);
            if (!card) return;
            const updated = { ...card, front: f, back: b, mediaType: t, mediaUrl: u };
            try {
              await api.cards.update(id, { front: f, back: b, mediaType: t, mediaUrl: u }); // a API aceita atualização parcial
              setCards(prev => prev.map(c => c.id === id ? updated : c));
            } catch (e) { console.error(e); }
          }}
          onDeleteCard={async (id) => {
            await api.cards.delete(id);
            setCards(prev => prev.filter(c => c.id !== id));
          }}
        />
      )}

      {view === 'study' && (
        <StudySession
          deck={decks.find(d => d.id === currentDeckId)}
          allCards={cards}
          onBack={() => setView('deck-view')}
          onAnswer={handleReviewAnswer}
        />
      )}
    </div>
  );
}
