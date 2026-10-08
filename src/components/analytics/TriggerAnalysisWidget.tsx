import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const data = [
  { time: '10:00', mood: 50, trigger: null },
  { time: '11:00', mood: 55, trigger: null },
  { time: '12:00', mood: 80, trigger: 'Enerjik Çalma Listesi' },
  { time: '13:00', mood: 75, trigger: null },
  { time: '14:00', mood: 60, trigger: null },
  { time: '15:00', mood: 30, trigger: 'Aşırı Sosyal Medya' },
  { time: '16:00', mood: 35, trigger: null },
  { time: '17:00', mood: 45, trigger: null },
  { time: '18:00', mood: 70, trigger: 'Yürüyüş' },
  { time: '19:00', mood: 72, trigger: null },
];

export const TriggerAnalysisWidget: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-comus-navy-subtle flex items-center justify-center text-comus-navy">
          <Activity className="w-4 h-4" />
        </div>
        <h3 className="font-serif font-bold text-lg text-comus-navy">
          Tetikleyici Analizi
        </h3>
      </div>
      <p className="text-xs text-comus-sand-dark">
        Gün içi duygu durumunuzu hangi olayların yükseltip düşürdüğünü inceleyin.
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(val) => {
                if (val === 80) return 'Yüksek';
                if (val === 20) return 'Düşük';
                return '';
              }}
              tick={{ fontSize: 10, fill: '#6B7280' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              labelStyle={{ fontWeight: 'bold', color: '#1F2937', marginBottom: '4px' }}
              formatter={(value: number, _name: string, props: any) => {
                const trigger = props.payload.trigger;
                return [trigger ? `Tetikleyici: ${trigger}` : `Mod: ${value}`, ''];
              }}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="#0f172a" 
              strokeWidth={3}
              dot={{ r: 3, fill: '#0f172a', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#D97757', stroke: '#fff', strokeWidth: 2 }}
            />
            <ReferenceDot x="12:00" y={80} r={6} fill="#10B981" stroke="#fff" strokeWidth={2} />
            <ReferenceDot x="15:00" y={30} r={6} fill="#EF4444" stroke="#fff" strokeWidth={2} />
            <ReferenceDot x="18:00" y={70} r={6} fill="#10B981" stroke="#fff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
            <TrendingUp className="w-4 h-4" /> Modu Yükseltenler
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">Enerjik Çalma Listesi, Açık Havada Yürüyüş</p>
        </div>
        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
            <TrendingDown className="w-4 h-4" /> Modu Düşürenler
          </div>
          <p className="text-[11px] text-rose-800 leading-relaxed">Aşırı Sosyal Medya Kullanımı, Uzun Ekran Süresi</p>
        </div>
      </div>
    </div>
  );
};
