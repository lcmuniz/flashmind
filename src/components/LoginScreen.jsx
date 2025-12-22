import React, { useState } from 'react';
import { Layers, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { api } from '../lib/api';

export default function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            let data;
            if (isRegistering) {
                data = await api.auth.register(email, password);
            } else {
                data = await api.auth.login(email, password);
            }
            onLogin(data);
        } catch (err) {
            setError("Falha na autenticação. Verifique suas credenciais.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md border border-white scale-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 mb-4">
                        <Layers size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900">FlashMind</h1>
                    <p className="text-slate-500 text-sm mt-1">Acesse sua jornada de aprendizado</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                autoFocus
                                type="email"
                                required
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                                placeholder="nome@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                required
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                                placeholder="******"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                    >
                        {isRegistering ? "Criar Conta" : "Entrar"} <ArrowRight size={18} />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={() => setIsRegistering(!isRegistering)} className="text-indigo-600 text-xs font-bold hover:underline">
                        {isRegistering ? "Já tenho uma conta" : "Não tem conta? Cadastre-se"}
                    </button>
                </div>
            </div>
        </div>
    );
}
