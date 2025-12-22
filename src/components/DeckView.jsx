import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Trash2, Edit2 } from 'lucide-react';
import { CARD_STATES } from '../lib/constants';

export default function DeckView({ deck, cards, userEmail, onBack, onStudy, onAddCard, onEditCard, onDeleteCard }) {
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingCard, setEditingCard] = useState(null);

    // Form states (shared for add/edit)
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [mediaType, setMediaType] = useState('text');
    const [mediaUrl, setMediaUrl] = useState('');

    const stats = useMemo(() => {
        const now = new Date();
        return {
            total: cards.length,
            new: cards.filter(c => c.state === CARD_STATES.NEW || c.state === 'NEW').length,
            due: cards.filter(c => new Date(c.nextReviewDate) <= now).length
        };
    }, [cards]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showAdd) setShowAdd(false);
                if (showEdit) setShowEdit(false);
                return;
            }

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key.toLowerCase() === 'e') {
                if ((stats.new > 0 || stats.due > 0) && !showAdd && !showEdit) onStudy();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onStudy, stats, showAdd, showEdit]);

    const openEditModal = (card) => {
        setEditingCard(card);
        setFront(card.front);
        setBack(card.back);
        setMediaType(card.mediaType || 'text');
        setMediaUrl(card.mediaUrl || '');
        setShowEdit(true);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 mb-6 text-sm transition-colors font-bold"><ChevronLeft size={16} /> Painel</button>
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 mb-8 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="text-center sm:text-left">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{deck?.name}</h1>
                        <div className="flex justify-center sm:justify-start gap-6 mt-4">
                            <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Novos</p><p className="text-xl font-black text-blue-600">{stats.new}</p></div>
                            <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Rever</p><p className="text-xl font-black text-green-600">{stats.due}</p></div>
                            <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p><p className="text-xl font-black text-slate-800">{stats.total}</p></div>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => {
                            setFront(''); setBack(''); setMediaType('text'); setMediaUrl('');
                            setShowAdd(true);
                        }} className="flex-1 sm:flex-none py-3 px-6 rounded-2xl border-2 border-slate-100 text-sm font-bold">Add Cartão</button>
                        <button disabled={stats.due === 0 && stats.new === 0} onClick={onStudy} className="flex-1 sm:flex-none py-3 px-8 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95 relative group">
                            Estudar Agora
                            <span className="absolute top-1 right-1.5 text-[8px] font-black bg-white/20 px-1.5 py-0.5 rounded transition-all group-hover:bg-white group-hover:text-indigo-600 tracking-tighter opacity-80">[E]</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {cards.map(card => (
                    <div key={card.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center text-sm hover:border-indigo-200 transition-all group">
                        <div className="truncate flex-1 pr-4">
                            <p className="font-bold text-slate-800 truncate">{card.front}</p>
                            <p className="text-slate-400 text-xs italic truncate mt-1">{card.back}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(card)} className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"><Edit2 size={18} /></button>
                            <button onClick={() => onDeleteCard(card.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl scale-in">
                        <h2 className="text-2xl font-black mb-6">Novo Cartão</h2>
                        <div className="mb-6 flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                            {['text', 'image', 'video'].map(t => (
                                <button key={t} onClick={() => setMediaType(t)} className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${mediaType === t ? 'border-white bg-white text-indigo-600 shadow-sm' : 'border-transparent text-slate-400'}`}>{t.toUpperCase()}</button>
                            ))}
                        </div>
                        <textarea autoFocus className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 min-h-[100px] text-sm mb-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" value={front} onChange={(e) => setFront(e.target.value)} placeholder="Frente do cartão (pergunta)" />
                        {mediaType !== 'text' && <input className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 text-sm mb-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="URL directa da mídia" />}
                        <textarea className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 min-h-[100px] text-sm mb-6 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Verso do cartão (resposta)" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                            <button onClick={() => { onAddCard(front, back, mediaType, mediaUrl); setFront(''); setBack(''); setShowAdd(false); }} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-100">Criar Cartão</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Modal */}
            {showEdit && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl scale-in">
                        <h2 className="text-2xl font-black mb-6">Editar Cartão</h2>
                        <div className="mb-6 flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                            {['text', 'image', 'video'].map(t => (
                                <button key={t} onClick={() => setMediaType(t)} className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${mediaType === t ? 'border-white bg-white text-indigo-600 shadow-sm' : 'border-transparent text-slate-400'}`}>{t.toUpperCase()}</button>
                            ))}
                        </div>
                        <textarea autoFocus className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 min-h-[100px] text-sm mb-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" value={front} onChange={(e) => setFront(e.target.value)} placeholder="Frente do cartão (pergunta)" />
                        {mediaType !== 'text' && <input className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 text-sm mb-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="URL directa da mídia" />}
                        <textarea className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 min-h-[100px] text-sm mb-6 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Verso do cartão (resposta)" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowEdit(false)} className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                            <button onClick={() => { onEditCard(editingCard.id, front, back, mediaType, mediaUrl); setShowEdit(false); }} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-100">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
