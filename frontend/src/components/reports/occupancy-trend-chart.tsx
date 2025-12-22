'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OccupancyTrendChartProps {
  data: Array<{
    month: string;
    occupancyRate: number;
    occupied: number;
    vacant: number;
  }>;
}

export function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Occupancy Trend</CardTitle>
        <CardDescription>Monthly occupancy rate performance</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="#888"
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
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
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <ReferenceLine
              y={90}
              label={{ value: 'Target 90%', position: 'right', fontSize: 11 }}
              stroke="#10b981"
              strokeDasharray="5 5"
              strokeOpacity={0.6}
            />
            <Line
              type="monotone"
              dataKey="occupancyRate"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', r: 5 }}
              activeDot={{ r: 7 }}
              name="Occupancy Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
