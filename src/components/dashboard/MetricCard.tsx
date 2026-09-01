import React from 'react';
import { ResponsiveContainer, AreaChart, Area, ReferenceLine, YAxis, Tooltip } from 'recharts';
import { LucideIcon, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { MetricKey } from '../../types/sensor';

export interface MetricCardProps {
  title: string;
  metricKey: MetricKey;
  icon: LucideIcon;
  currentValue: number;
  baselineValue: number;
  unit: string;
  zScore: number;
  deviationPercent: number;
  history: { date: string; value: number }[];
  description: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon: Icon,
  currentValue,
  baselineValue,
  unit,
  zScore,
  deviationPercent,
  history,
  description,
}) => {
  const isAnomaly = Math.abs(zScore) >= 2.0;
  const isElevated = Math.abs(zScore) >= 1.5;

  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let badgeText = 'Normal';
  let TrendIcon = Minus;

  if (deviationPercent > 5) {
    TrendIcon = TrendingUp;
  } else if (deviationPercent < -5) {
    TrendIcon = TrendingDown;
  }

  if (isAnomaly) {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    badgeText = zScore > 0 ? `+${Math.abs(deviationPercent)}% Sapma` : `-${Math.abs(deviationPercent)}% Sapma`;
  } else if (isElevated) {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    badgeText = `${deviationPercent > 0 ? '+' : ''}${deviationPercent}% Değişim`;
  }

  const chartData = history.map((item) => ({
    date: item.date,
    value: item.value,
  }));

  // Unique chart gradient id
  const gradientId = `gradient-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-soft border border-comus-sand-light/20 flex flex-col justify-between hover:shadow-soft-lg transition-all duration-300 group">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              isAnomaly ? 'bg-rose-50 text-rose-600' : 'bg-comus-navy-subtle text-comus-navy'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-comus-navy text-sm sm:text-base leading-tight truncate">
                {title}
              </h4>
              <span className="text-[11px] text-comus-sand-dark block truncate mt-0.5">
                {description}
              </span>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 shrink-0 whitespace-nowrap ${badgeColor}`}>
            {isAnomaly && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
            <TrendIcon className="w-3 h-3" />
            <span>{badgeText}</span>
          </div>
        </div>

        {/* Metric Values */}
        <div className="flex items-baseline justify-between my-3">
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-serif text-comus-navy tracking-tight">
              {currentValue} <span className="text-sm font-sans font-normal text-comus-sand-dark">{unit}</span>
            </div>
            <div className="text-xs text-comus-sand-dark mt-0.5">
              Baz Hattı Normali: <span className="font-medium text-comus-navy">{baselineValue} {unit}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono font-medium text-comus-sand-dark">
              Z-Skoru: <span className={`font-semibold ${isAnomaly ? 'text-rose-600' : 'text-comus-navy'}`}>{zScore > 0 ? `+${zScore}` : zScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sparkline Chart */}
      <div className="h-20 w-full mt-2 pt-2 border-t border-comus-sand-light/10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isAnomaly ? '#C0674F' : '#1E3A5F'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={isAnomaly ? '#C0674F' : '#1E3A5F'} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
            <ReferenceLine y={baselineValue} stroke="#8C827A" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-comus-navy text-white text-[11px] px-2 py-1 rounded-lg shadow-md font-sans">
                      <span>{payload[0].payload.date}: </span>
                      <strong className="font-bold">{payload[0].value} {unit}</strong>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isAnomaly ? '#C0674F' : '#1E3A5F'}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: '#C0674F' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
