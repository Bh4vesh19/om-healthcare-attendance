import React from 'react';

const ZoneBadge = ({ state }) => {
    if (state.loading) {
        return (
            <div className="flex items-center justify-center py-2">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-border text-textSecondary font-bold text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-textSecondary border-t-transparent animate-spin"></div>
                    <span>LOCATING...</span>
                </div>
            </div>
        );
    }

    if (state.error || state.distance === null) {
        return (
            <div className="flex items-center justify-center py-2">
                <div className="inline-flex max-w-full items-center gap-3 px-6 py-3 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 font-bold text-sm">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span>{state.error || 'GPS OFF / DENIED'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-2 animate-fade-in">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border font-bold text-sm shadow-soft ${
                state.isWithinRange
                    ? 'bg-green/10 text-green border-green/20'
                    : 'bg-red/10 text-red border-red/20'
            }`}>
                <div className={`w-3 h-3 rounded-full ${state.isWithinRange ? 'bg-green animate-pulse-green' : 'bg-red animate-pulse-red'}`}></div>
                <span>{state.isWithinRange ? 'IN RANGE' : 'OUT OF RANGE'} · {Math.round(state.distance)}m · {state.movementStatus || 'Idle'}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-textSecondary">
                <span className="rounded-full border border-white/10 bg-cardHover/40 px-3 py-1">
                    Accuracy {state.accuracy != null ? `${Math.round(state.accuracy)}m` : '--'}
                </span>
                {state.warning && (
                    <span className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1 text-amber">
                        {state.warning}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ZoneBadge;
