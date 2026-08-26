import React, { useRef, useEffect } from 'react';

const MessageWindow = ({ messages }) => {
    const containerRef = useRef(null);

    const scrollToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="message-window" ref={containerRef}>
            {messages.map((msg, index) => (
                <div key={index} className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
                    {msg.content}
                </div>
            ))}
        </div>
    );
};

export default MessageWindow;
