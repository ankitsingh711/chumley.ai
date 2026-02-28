import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Chatbot } from '../chat/Chatbot';

export function Layout() {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
            {!isChatOpen && (
                <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow-[0_18px_45px_-20px_rgba(37,99,235,0.9)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_55px_-20px_rgba(37,99,235,0.95)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                    aria-label="Open chatbot"
                >
                    <MessageSquare className="h-6 w-6" />
                    <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                </button>
            )}
            <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
    );
}
