'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// BACKEND INTEGRATION POINT: Fetch 7-day stock movement from /api/reports/stock-movement

const stockData = [
  { date: 'Aug 10', stockIn: 312, stockOut: 198 },
  { date: 'Aug 11', stockIn: 180, stockOut: 245 },
  { date: 'Aug 12', stockIn: 420, stockOut: 167 },
  { date: 'Aug 13', stockIn: 95, stockOut: 310 },
  { date: 'Aug 14', stockIn: 380, stockOut: 220 },
  { date: 'Aug 15', stockIn: 290, stockOut: 185 },
  { date: 'Aug 16', stockIn: 247, stockOut: 183 },
];

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={`tip-${entry.name}`} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-semibold tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function StockMovementChart() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-foreground">Stock Movement</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 7 days — Stock-In vs Stock-Out units</p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">Aug 10–16, 2026</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={stockData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          />
          <Area
            type="monotone"
            dataKey="stockIn"
            name="Stock-In"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#gradIn)"
          />
          <Area
            type="monotone"
            dataKey="stockOut"
            name="Stock-Out"
            stroke="var(--danger)"
            strokeWidth={2}
            fill="url(#gradOut)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}