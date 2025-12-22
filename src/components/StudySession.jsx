import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, CheckCircle2, Check } from 'lucide-react';
import { ANSWERS } from '../lib/constants';

export default function StudySession({ deck, allCards, onBack, onAnswer }) {
    const [queue, setQueue] = useState([]);
    const [index, setIndex] = useState(0);
    const [total, setTotal] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [finished, setFinished] = useState(false);
    const [typed, setTyped] = useState('');
    const [trans, setTrans] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const now = new Date();
        const sorted = allCards.filter(c => new Date(c.nextReviewDate) <= now)
            .sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));
        setQueue(sorted);
        setTotal(sorted.length);
    }, []);

    const card = queue[index];

    useEffect(() => {
        if (inputRef.current) {
            if (!isFlipped && !trans) inputRef.current.focus();
            else if (isFlipped) inputRef.current.blur();
        }
    }, [isFlipped, index, trans, card]);

    const handleAction = async (answer) => {
        if (trans || !card) return;
        setTrans(true);
        await onAnswer(card, answer);
        setIsFlipped(false);
        setTimeout(() => {
            setTyped('');
            if (index < queue.length - 1) { setIndex(i => i + 1); setTrans(false); }
            else { setFinished(true); setTrans(false); }
        }, 450);
    };

    useEffect(() => {
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                onBack();
                return;
            }

            if (e.target.tagName === 'INPUT') return;

            if (e.key.toLowerCase() === 'v') {
                onBack();
                return;
            }

            if (!isFlipped || trans) return;
            const k = e.key.toLowerCase();
            if (k === 'e') handleAction(ANSWERS.AGAIN);
            else if (k === 'd') handleAction(ANSWERS.HARD);
            else if (k === 'b') handleAction(ANSWERS.GOOD);
            else if (k === 'f') handleAction(ANSWERS.EASY);
        };
        window.addEventListener('keydown', keyHandler);
        return () => window.removeEventListener('keydown', keyHandler);
    }, [isFlipped, trans, card, onBack]);

    const match = useMemo(() => card && typed.trim().toLowerCase() === card.back.trim().toLowerCase(), [typed, card]);

    if (finished || total === 0) {
        return (
            <div className="max-w-md mx-auto px-4 py-20 text-center">
                <div className="bg-white p-12 rounded-[40px] shadow-2xl border scale-in">
                    <CheckCircle2 size={64} className="mx-auto text-green-500 mb-6 animate-bounce" />
                    <h2 className="text-3xl font-black mb-3 text-slate-900 tracking-tight">Sessão Finalizada!</h2>
                    <p className="text-slate-500 text-sm mb-10 leading-relaxed">Você revisou todas as tarefas agendadas para hoje. Ótimo trabalho!</p>
                    <button onClick={onBack} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Voltar ao Baralho</button>
                </div>
            </div>
        );
    }

    if (!card) return null;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 h-screen flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-900 p-2 transition-colors"><ChevronLeft size={24} /></button>
                <div className="flex items-center gap-4">
                    <div className="h-2 w-40 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${total > 0 ? ((index) / total) * 100 : 0}%` }}></div>
                    </div>
                    <span className="text-xs font-black text-slate-400 tracking-widest uppercase">{index + 1} / {total}</span>
                </div>
                <div className="w-12"></div>
            </div>

            <div className="flex-1 flex flex-col justify-start perspective-1000 min-h-0">
                <div className={`relative w-full h-[380px] transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                    <div className="absolute inset-0 bg-white rounded-[40px] shadow-2xl border border-slate-50 flex flex-col p-10 backface-hidden overflow-hidden">
                        <div className="text-[10px] font-black text-slate-300 uppercase mb-4 tracking-widest">{card.state}</div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                            {card.mediaType === 'image' && card.mediaUrl && <img src={card.mediaUrl} alt="Visual" className="max-h-[140px] rounded-2xl mb-6 object-contain shadow-md" />}
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 text-center mb-8 leading-tight break-words w-full px-4">{card.front}</h2>
                            <div className="w-full max-w-sm mt-auto">
                                <input ref={inputRef} autoFocus disabled={trans} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xl font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-center disabled:opacity-50" placeholder="Digite aqui..." value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !trans && !isFlipped && setIsFlipped(true)} />
                                {!isFlipped && <button disabled={trans} onClick={() => setIsFlipped(true)} className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all hover:bg-indigo-700">Ver Resposta (Enter)</button>}
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-white rounded-[40px] shadow-2xl border-2 border-indigo-50 flex flex-col p-10 backface-hidden rotate-y-180 overflow-y-auto">
                        <div className="text-[10px] font-black text-indigo-400 uppercase mb-6 tracking-widest">Verificação</div>
                        <div className="space-y-4 flex-1 flex flex-col justify-center">
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Sua Resposta</span>
                                <p className={`text-lg font-bold ${match ? 'text-green-600' : 'text-red-500 line-through'}`}>{typed || "(Vazio)"}</p>
                            </div>
                            <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                                <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1 tracking-widest">Resposta Correta</span>
                                <p className="text-xl font-black text-indigo-900 leading-tight italic">{card.back}</p>
                            </div>
                            {match && <div className="text-center text-green-600 font-black uppercase text-xs tracking-widest py-2 animate-bounce flex items-center justify-center gap-2"><Check size={14} /> Acertou!</div>}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mt-8 mb-6 grid grid-cols-4 gap-3 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                {[
                    { id: ANSWERS.AGAIN, label: 'Errei', key: 'E', color: 'bg-red-500' },
                    { id: ANSWERS.HARD, label: 'Difícil', key: 'D', color: 'bg-orange-500' },
                    { id: ANSWERS.GOOD, label: 'Bom', key: 'B', color: 'bg-green-500' },
                    { id: ANSWERS.EASY, label: 'Fácil', key: 'F', color: 'bg-blue-500' }
                ].map(btn => (
                    <button key={btn.id} disabled={trans} onClick={() => handleAction(btn.id)} className={`${btn.color} text-white py-4 px-1 rounded-2xl shadow-xl flex flex-col items-center justify-center relative active:scale-95 transition-all group overflow-hidden`}>
                        <span className="absolute top-1 right-2 text-[8px] font-black bg-black/10 px-1.5 py-0.5 rounded transition-all group-hover:bg-white group-hover:text-slate-900 tracking-tighter">[{btn.key}]</span>
                        <span className="font-black text-xs uppercase tracking-tighter">{btn.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
