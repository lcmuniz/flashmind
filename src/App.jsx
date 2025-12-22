import React, { useState, useEffect } from 'react';
import { LEARNING_STEPS, GRADUATION_INTERVAL, EASY_INTERVAL, MIN_EASE_FACTOR, CARD_STATES, ANSWERS } from './lib/constants';
import { api } from './lib/api';

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
  const [loading, setLoading] = useState(false);

  // Carregar decks ao entrar no dashboard
  useEffect(() => {
    if (view === 'dashboard' && user) {
      loadDecks();
    }
  }, [view, user]);

  // Carregar cards ao selecionar deck
  useEffect(() => {
    if (currentDeckId) {
      loadCards(currentDeckId);
    }
  }, [currentDeckId]);

  const loadDecks = async () => {
    try {
      const data = await api.decks.list();
      setDecks(data);
    } catch (err) {
      console.error(err);
      if (err.message.includes('auth')) handleLogout();
    }
  };

  const loadCards = async (deckId) => {
    try {
      const data = await api.cards.list(deckId);
      setCards(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewAnswer = async (card, answer) => {
    let updatedCard = { ...card };
    const now = new Date();

    if (updatedCard.state === CARD_STATES.NEW || updatedCard.state === 'NEW') {
      updatedCard.state = CARD_STATES.LEARNING;
      updatedCard.learningStepIndex = 0;
      updatedCard.nextReviewDate = new Date(now.getTime() + LEARNING_STEPS[0] * 60000).toISOString();
    } else if (updatedCard.state === CARD_STATES.LEARNING) {
      if (answer === ANSWERS.AGAIN) {
        updatedCard.learningStepIndex = 0;
        updatedCard.nextReviewDate = new Date(now.getTime() + LEARNING_STEPS[0] * 60000).toISOString();
      } else if (answer === ANSWERS.EASY) {
        updatedCard.state = CARD_STATES.REVIEW;
        updatedCard.interval = EASY_INTERVAL;
        updatedCard.repetitions = 1;
        updatedCard.nextReviewDate = new Date(now.getTime() + EASY_INTERVAL * 24 * 60 * 60 * 1000).toISOString();
      } else {
        const nextStepIndex = (updatedCard.learningStepIndex || 0) + 1;
        if (nextStepIndex < LEARNING_STEPS.length) {
          updatedCard.learningStepIndex = nextStepIndex;
          updatedCard.nextReviewDate = new Date(now.getTime() + LEARNING_STEPS[nextStepIndex] * 60000).toISOString();
        } else {
          updatedCard.state = CARD_STATES.REVIEW;
          updatedCard.interval = GRADUATION_INTERVAL;
          updatedCard.repetitions = 1;
          updatedCard.nextReviewDate = new Date(now.getTime() + GRADUATION_INTERVAL * 24 * 60 * 60 * 1000).toISOString();
        }
      }
    } else if (updatedCard.state === CARD_STATES.REVIEW) {
      if (answer === ANSWERS.AGAIN) {
        updatedCard.repetitions = 0;
        updatedCard.interval = 1;
        updatedCard.ease_factor = Math.max(MIN_EASE_FACTOR, updatedCard.ease_factor - 0.2);
        updatedCard.state = CARD_STATES.LEARNING;
        updatedCard.learningStepIndex = 0;
        updatedCard.nextReviewDate = new Date(now.getTime() + LEARNING_STEPS[0] * 60000).toISOString();
      } else {
        if (answer === ANSWERS.HARD) {
          updatedCard.ease_factor = Math.max(MIN_EASE_FACTOR, updatedCard.ease_factor - 0.15);
          updatedCard.interval = Math.max(1, updatedCard.interval * 1.2);
        } else if (answer === ANSWERS.GOOD) {
          updatedCard.interval = updatedCard.interval * updatedCard.ease_factor;
        } else if (answer === ANSWERS.EASY) {
          updatedCard.ease_factor = updatedCard.ease_factor + 0.15;
          updatedCard.interval = updatedCard.interval * updatedCard.ease_factor * 1.3;
        }
        updatedCard.interval = Math.round(updatedCard.interval);
        updatedCard.repetitions += 1;
        updatedCard.nextReviewDate = new Date(now.getTime() + updatedCard.interval * 24 * 60 * 60 * 1000).toISOString();
      }
    }

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setUser(null);
    setView('login');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

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
          userEmail={user?.email}
          onBack={() => setView('dashboard')}
          onStudy={() => setView('study')}
          onAddCard={(f, b, t, u) => addCardToDeck(currentDeckId, f, b, t, u)}
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
