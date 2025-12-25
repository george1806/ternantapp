'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentMethodsChartProps {
  data: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  currency?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const formatCurrency = (value: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMethodName = (method: string) => {
  const methodNames: Record<string, string> = {
    CASH: 'Cash',
    BANK: 'Bank Transfer',
    MOBILE: 'Mobile Money',
    CARD: 'Card',
    OTHER: 'Other',
  };
  return methodNames[method] || method;
};

export function PaymentMethodsChart({ data, currency = 'USD' }: PaymentMethodsChartProps) {
  const chartData = data.map((item) => ({
    name: formatMethodName(item.method),
    value: item.amount,
    percentage: item.percentage,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Revenue distribution by payment type</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percent }) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
              outerRadius={110}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value, currency)}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => value}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
