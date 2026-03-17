import React from 'react';

const formatNumber = (value, digits = 6) => (typeof value === 'number' ? value.toFixed(digits) : '--');

const TrackingDebugPanel = ({ state, enabled, onToggle }) => {
  return (
    <div className="card w-full p-5 flex flex-col gap-4 bg-card/90">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Diagnostics</p>
          <h3 className="mt-1 text-lg font-semibold text-textPrimary">Tracking debug panel</h3>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
            enabled ? 'bg-blue text-white shadow-soft' : 'border border-white/10 bg-cardHover/50 text-textSecondary'
          }`}
        >
          {enabled ? 'Test Mode On' : 'Test Mode'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="rounded-3xl border border-white/5 bg-cardHover/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-textSecondary">Latitude</p>
          <p className="mt-1 font-semibold text-textPrimary">{formatNumber(state.latitude)}</p>
        </div>
        <div className="rounded-3xl border border-white/5 bg-cardHover/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-textSecondary">Longitude</p>
          <p className="mt-1 font-semibold text-textPrimary">{formatNumber(state.longitude)}</p>
        </div>
        <div className="rounded-3xl border border-white/5 bg-cardHover/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-textSecondary">Distance</p>
          <p className="mt-1 font-semibold text-textPrimary">{state.distance != null ? `${Math.round(state.distance)} m` : '--'}</p>
        </div>
        <div className="rounded-3xl border border-white/5 bg-cardHover/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-textSecondary">Accuracy</p>
          <p className="mt-1 font-semibold text-textPrimary">{state.accuracy != null ? `${Math.round(state.accuracy)} m` : '--'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full border border-white/10 bg-cardHover/50 px-3 py-1 text-textSecondary">
          Permission: {state.permissionState || 'prompt'}
        </span>
        <span className="rounded-full border border-white/10 bg-cardHover/50 px-3 py-1 text-textSecondary">
          Movement: {state.movementStatus || 'Idle'}
        </span>
        <span className="rounded-full border border-white/10 bg-cardHover/50 px-3 py-1 text-textSecondary">
          Mode: {state.isBackgrounded ? 'Background' : 'Foreground'}
        </span>
        <span className="rounded-full border border-white/10 bg-cardHover/50 px-3 py-1 text-textSecondary">
          Zone: {state.zoneStatus || 'unknown'}
        </span>
      </div>
    </div>
  );
};

export default TrackingDebugPanel;
