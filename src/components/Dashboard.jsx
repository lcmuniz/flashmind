import React, { useState } from 'react';
import { User, LogOut, Plus, Layers, Trash2, Play, BookOpen, FileUp, FileDown } from 'lucide-react';
import { api } from '../lib/api';

export default function Dashboard({ decks, user, onLogout, onCreateDeck, onSelectDeck, onDeleteDeck }) {
    const [showModal, setShowModal] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [deckName, setDeckName] = useState('');
    const [importText, setImportText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleExportAll = async () => {
        setIsProcessing(true);
        try {
            let exportStr = "";
            for (const deck of decks) {
                exportStr += `Deck: ${deck.name}\n`;
                const cards = await api.cards.list(deck.id);
                cards.forEach(card => {
                    exportStr += `P: ${card.front}\nAlso: ${card.back}\n`; // Fixing typo in user request "Also: " was not requested, user said "R: ". Wait, user request: "R: resposta". ok.
                });
                exportStr += `---\n`;
            }
            // Wait, I need to match user request EXACTLY.
            // Request:
            // Deck: nome do deck 1
            // P: pergunta 1
            // R: resposta1
            // ...

            let finalExportStr = "";
            for (const deck of decks) {
                finalExportStr += `Deck: ${deck.name}\n`;
                const cards = await api.cards.list(deck.id);
                cards.forEach(card => {
                    finalExportStr += `P: ${card.front}\nR: ${card.back}\n`;
                });
                finalExportStr += `---\n`;
            }

            const blob = new Blob([finalExportStr], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flashmind_backup.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error(err); } finally { setIsProcessing(false); }
    };

    const handleImportAll = async () => {
        const text = importText.trim();
        if (!text) return;
        setIsProcessing(true);
        try {
            const blocks = text.split('---').map(b => b.trim()).filter(b => b);
            for (const block of blocks) {
                const lines = block.split('\n');
                let currentDeckName = "";
                const cardsToImport = [];
                let currentP = "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('Deck:')) currentDeckName = trimmed.replace('Deck:', '').trim();
                    else if (trimmed.startsWith('P:')) currentP = trimmed.replace('P:', '').trim();
                    else if (trimmed.startsWith('R:')) {
                        const currentR = trimmed.replace('R:', '').trim();
                        if (currentP && currentR) {
                            cardsToImport.push({ front: currentP, back: currentR });
                            currentP = "";
                        }
                    }
                }

                if (currentDeckName && cardsToImport.length > 0) {
                    // Create Deck
                    // We need to call API directly or use prop. Props update state in App, but we are in a loop.
                    // Better verify if deck exists? No, always create new as per logic.
                    // Using api directly for reliability in loop, but we need to update Parent state.
                    // Calling prop onCreateDeck updates parent state.

                    const newDeckId = await onCreateDeck(currentDeckName);

                    if (newDeckId) {
                        for (const card of cardsToImport) {
                            await api.cards.create({
                                deckId: newDeckId,
                                front: card.front,
                                back: card.back,
                                state: 'NOVO', // Default values handled by API or logic
                                // API expects: deckId, front, back, mediaType, etc.
                                // Minimal:
                                deckId: newDeckId,
                                front: card.front,
                                back: card.back
                            });
                        }
                    }
                }
            }
            setImportText('');
            setShowImport(false);
            // Ideally trigger a reload of decks in App, but onCreateDeck updates the list. 
            // Cards are only loaded on view, so we are good.
        } catch (err) {
            console.error("Erro na importação:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">FlashMind</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                        <User size={14} className="text-indigo-500" />
                        <span><strong className="text-slate-700">{user?.email}</strong></span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button onClick={onLogout} className="bg-white border border-slate-200 text-slate-500 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"><LogOut size={14} /> Sair</button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>
                    <button onClick={() => setShowImport(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><FileUp size={16} /> Importar</button>
                    <button onClick={handleExportAll} disabled={isProcessing} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                        {isProcessing ? "..." : <FileDown size={16} />} Exportar
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"><Plus size={18} /> Novo</button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map(deck => (
                    <div key={deck.id} onClick={() => onSelectDeck(deck.id)} className="bg-white border border-slate-200 p-5 rounded-[24px] hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><Layers size={20} /></div>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id); }} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 truncate mb-1">{deck.name}</h3>
                        <div className="text-indigo-600 text-[10px] font-black uppercase flex items-center gap-2"><Play size={10} fill="currentColor" /> Começar Estudo</div>
                    </div>
                ))}
                {decks.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-[32px]">
                        <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
                        <h3 className="text-md font-semibold text-slate-500 tracking-tight">Crie ou importe o seu primeiro baralho.</h3>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl scale-in">
                        <h2 className="text-xl font-bold mb-4">Novo Baralho</h2>
                        <input autoFocus className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 mb-6 outline-none focus:border-indigo-500 transition-all text-sm font-semibold" placeholder="Ex: Anatomia, Inglês..." value={deckName} onChange={(e) => setDeckName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (onCreateDeck(deckName), setShowModal(false), setDeckName(''))} />
                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                            <button onClick={() => { onCreateDeck(deckName); setShowModal(false); setDeckName(''); }} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-100">Criar</button>
                        </div>
                    </div>
                </div>
            )}

            {showImport && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] max-w-2xl w-full shadow-2xl max-h-[85vh] flex flex-col scale-in overflow-hidden">
                        <div className="p-8 pb-4">
                            <h2 className="text-2xl font-black flex items-center gap-2 text-indigo-600"><FileUp size={24} /> Importar Dados</h2>
                            <p className="text-[11px] text-slate-400 mt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 italic tracking-tight">Formato: <b>Deck: nome</b>, <b>P: pergunta</b>, <b>R: resposta</b>. Separe decks com <b>---</b>.</p>
                        </div>

                        <div className="px-8 flex-1 overflow-y-auto min-h-0">
                            <textarea
                                className="w-full border-2 border-slate-100 rounded-2xl p-5 text-xs font-mono focus:border-indigo-500 outline-none transition-all min-h-[250px] resize-none"
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder={`Deck: Exemplo\nP: Questão\nR: Resposta\n---\nDeck: Segundo Baralho\nP: Questão A\nR: Resposta A`}
                            />
                        </div>

                        <div className="p-8 pt-4 flex gap-3">
                            <button onClick={() => { setShowImport(false); setImportText(''); }} className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                            <button
                                disabled={isProcessing || !importText.trim()}
                                onClick={handleImportAll}
                                className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-100"
                            >
                                {isProcessing ? "Importando..." : "Importar Agora"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
