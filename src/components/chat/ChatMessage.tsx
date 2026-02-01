import { Bot, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface ChatMessageProps {
    message: {
        id: string;
        text: string;
        sender: 'user' | 'bot';
        timestamp: Date;
    };
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isBot = message.sender === 'bot';

    return (
        <div className={`flex w-full gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
            {isBot && (
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-teal-100 text-teal-600">
                    <Bot className="h-4 w-4" />
                </div>
            )}

            <div className={`flex flex-col max-w-[80%] ${isBot ? 'items-start' : 'items-end'}`}>
                <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm ${isBot
                            ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                            : 'bg-teal-600 text-white rounded-tr-none'
                        }`}
                >
                    {message.text}
                </div>
                <span className="mt-1 text-[10px] text-gray-400">
                    {format(message.timestamp, 'HH:mm')}
                </span>
            </div>

            {!isBot && (
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <UserIcon className="h-4 w-4" />
                </div>
            )}
        </div>
    );
}
