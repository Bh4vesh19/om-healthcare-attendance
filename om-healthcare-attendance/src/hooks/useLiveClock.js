import { useState, useEffect } from 'react';

export const useLiveClock = (tickMs = 60000) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, tickMs);
        return () => clearInterval(timer);
    }, [tickMs]);

    const timeString = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return { timeObj: time, timeString, dateString };
};
