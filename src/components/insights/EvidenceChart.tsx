import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { EvidenceItem } from '../../types/engine';

interface EvidenceChartProps {
  evidence: EvidenceItem;
}

export const EvidenceChart: React.FC<EvidenceChartProps> = ({ evidence }) => {
  return (
    <div className="bg-comus-surface rounded-2xl p-4 border border-comus-sand-light/20 my-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 text-xs">
        <div className="font-semibold text-comus-navy truncate">
          {evidence.metricLabel} (Son 14 Gün)
        </div>
        <div className="font-mono text-xs shrink-0 tabular-nums">
          <span className="text-comus-sand-dark">Baz Hattı: </span>
          <span className="font-semibold text-comus-navy">{evidence.baselineValue} {evidence.unit}</span>
          <span className="mx-1.5 text-comus-sand-light">|</span>
          <span className="text-comus-copper font-semibold">
            {evidence.changePercent > 0 ? `+${evidence.changePercent}%` : `${evidence.changePercent}%`}
          </span>
        </div>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={evidence.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`evidence-grad-${evidence.metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C0674F" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C0674F" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8C827A' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8C827A' }} tickLine={false} />
            <ReferenceLine y={evidence.baselineValue} stroke="#1E3A5F" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Baz', position: 'insideTopLeft', fill: '#1E3A5F', fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-comus-navy text-white text-xs p-2 rounded-lg shadow-md font-sans">
                      <div className="text-[10px] text-white/70">{payload[0].payload.date}</div>
                      <div>Gözlenen: <strong className="font-bold">{payload[0].value} {evidence.unit}</strong></div>
                      <div>Baz Hattı: <span className="text-white/80">{evidence.baselineValue} {evidence.unit}</span></div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#C0674F"
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#evidence-grad-${evidence.metricKey})`}
              dot={{ r: 3, fill: '#C0674F' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
