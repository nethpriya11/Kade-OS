import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, ChefHat } from 'lucide-react';
import { askGemini } from '../lib/gemini';

const KitchenAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your Kitchen Assistant. How can I help you today? I can help with recipes, cooking tips, or inventory questions.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const responseText = await askGemini(input);

        setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
        setIsLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-surface border border-border rounded-3xl shadow-2xl w-80 md:w-96 h-[500px] flex flex-col mb-4 animate-in slide-in-from-bottom-10 fade-in duration-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-primary p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-bg">
                            <ChefHat size={24} />
                            <h3 className="font-bold text-lg">Kitchen Assistant</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-bg/80 hover:text-bg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg/50">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-primary text-bg rounded-br-none'
                                            : 'bg-surface border border-border text-text rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-surface border border-border p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-surface border-t border-border">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Ask for a recipe..."
                                className="w-full bg-bg border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-text focus:border-primary focus:outline-none"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 p-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-surface text-text-muted border border-border' : 'bg-primary text-bg animate-bounce'
                    }`}
            >
                {isOpen ? <X size={24} /> : <Sparkles size={24} />}
            </button>
        </div>
    );
};

export default KitchenAssistant;
