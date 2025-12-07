'use client';

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface InvoiceDistributionChartProps {
  data: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  currency: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  sent: '#3b82f6',
  paid: '#10b981',
  overdue: '#ef4444',
  cancelled: '#6b7280',
};

export function InvoiceDistributionChart({
  data,
  currency,
}: InvoiceDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Distribution</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No invoice data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for pie chart
  const chartData = data.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    amount: item.amount,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">Count: {data.value}</p>
        </div>
      );
    }
    return null;
  };

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STATUS_COLORS[data[index]?.status.toLowerCase()] || '#3b82f6'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend with counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[item.status.toLowerCase()] || '#3b82f6',
              }}
            />
            <div className="text-xs">
              <p className="font-medium capitalize">{item.status}</p>
              <p className="text-muted-foreground">
                {item.count} ({Math.round((item.count / total) * 100)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
