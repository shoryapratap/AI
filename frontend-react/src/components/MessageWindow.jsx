import React from 'react';

const MessageWindow = ({ messages }) => {
    return (
        <div className="message-window">
            {messages.map((msg, index) => (
                <div key={index} className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
                    {msg.content}
                </div>
            ))}
        </div>
    );
};

export default MessageWindow;
