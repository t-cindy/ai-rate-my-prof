'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiSend } from 'react-icons/fi';

interface Message {
  role: string;
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your AI assistant. Ask me anything about your professors.`,
    },
  ]);
  const [message, setMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (message.trim() === '') return;

    setMessage('');
    setMessages((messages: Message[]) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '...' },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        const processText = async ({ done, value }: { done: boolean; value?: Uint8Array }): Promise<string> => {
          if (done) return result;

          const text = decoder.decode(value || new Uint8Array(), { stream: true });
          setMessages((messages: Message[]) => {
            let lastMessage = messages[messages.length - 1];
            let otherMessages = messages.slice(0, messages.length - 1);
            return [
              ...otherMessages,
              { ...lastMessage, content: lastMessage.content + text },
            ];
          });

          result += text;
          return reader.read().then(processText);
        };

        await reader.read().then(processText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((messages: Message[]) => [
        ...messages.slice(0, -1),
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-pastel-pink via-pastel-yellow to-pastel-blue overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8">
        <div className="absolute top-0 left-0 w-96 h-96 bg-pastel-blue rounded-full filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-20 right-0 w-80 h-80 bg-pastel-green rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-20 w-96 h-96 bg-pastel-pink rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-0 right-10 w-72 h-72 bg-pastel-yellow rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-6000"></div>
      </div>

      {/* Floating Chat UI */}
      <div className="relative z-10 flex flex-col items-center space-y-6 w-full max-w-xl p-4">
        <div className="w-full bg-white bg-opacity-30 backdrop-blur-lg rounded-3xl shadow-2xl p-6 space-y-4 transform transition-all duration-500">
          <header className="text-center">
            <h1 className="text-2xl font-bold text-gray-700">AI Professor Assistant</h1>
          </header>
          <div className="max-h-96 overflow-y-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl shadow-md text-base max-w-xs md:max-w-md ${
                    message.role === 'assistant'
                      ? 'bg-pastel-blue text-gray-800'
                      : 'bg-pastel-green text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Field */}
        <div className="relative w-full">
          <input
            type="text"
            className="w-full px-6 py-4 text-gray-800 bg-white bg-opacity-40 rounded-full focus:outline-none focus:ring-2 focus:ring-pastel-green placeholder-gray-700 placeholder-opacity-60 shadow-xl"
            placeholder="Ask about a professor..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-pastel-green rounded-full hover:bg-pastel-green-dark transition duration-300 text-gray-800 shadow-md"
          >
            <FiSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
