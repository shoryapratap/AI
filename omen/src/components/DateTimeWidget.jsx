import React, { useState, useEffect } from 'react';
import './SystemWidgets.css';

const DateTimeWidget = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="system-widget date-time-widget">
            <div className="time-large">{timeStr}</div>
            <div className="date-small">{dateStr}</div>
        </div>
    );
};

export default DateTimeWidget;
