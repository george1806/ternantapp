'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PropertyComparisonChartProps {
  data: Array<{
    compoundName: string;
    totalUnits: number;
    occupied: number;
    occupancyRate: number;
  }>;
  metric?: 'occupancy' | 'units';
}

const getBarColor = (occupancyRate: number) => {
  if (occupancyRate >= 90) return '#10b981';
  if (occupancyRate >= 70) return '#f59e0b';
  return '#ef4444';
};

export function PropertyComparisonChart({
  data,
  metric = 'occupancy',
}: PropertyComparisonChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Performance</CardTitle>
        <CardDescription>Occupancy rate by property</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
              stroke="#888"
            />
            <YAxis
              type="category"
              dataKey="compoundName"
              width={120}
              tick={{ fontSize: 11 }}
              stroke="#888"
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}%`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            />
            <Bar
              dataKey="occupancyRate"
              radius={[0, 6, 6, 0]}
              barSize={24}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancyRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
