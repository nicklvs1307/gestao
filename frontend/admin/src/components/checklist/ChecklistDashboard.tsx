import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';
import { ChecklistExecution, Checklist } from '../../types/checklist';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface ChecklistDashboardProps {
  executions: ChecklistExecution[];
  checklists: Checklist[];
  loading?: boolean;
}

export const ChecklistDashboard: React.FC<ChecklistDashboardProps> = ({
  executions,
  checklists,
  loading,
}) => {
  const conformityData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map((date) => {
      const dayStr = date.toISOString().split('T')[0];
      const dayExecutions = executions.filter(
        (e) => e.completedAt?.startsWith?.(dayStr) || new Date(e.completedAt).toISOString().startsWith(dayStr)
      );

      const total = dayExecutions.reduce((acc, e) => acc + (e.responses?.length || 0), 0);
      const ok = dayExecutions.reduce(
        (acc, e) => acc + (e.responses?.filter((r) => r.isOk).length || 0),
        0
      );

      return {
        date: dayStr,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        executado: dayExecutions.length,
        conformidade: total > 0 ? Math.round((ok / total) * 100) : 0,
      };
    });
  }, [executions]);

  const sectorData = useMemo(() => {
    const sectorCounts: Record<string, number> = {};
    checklists.forEach((c) => {
      const sectorName = c.sector?.name || 'Sem setor';
      sectorCounts[sectorName] = (sectorCounts[sectorName] || 0) + 1;
    });

    return Object.entries(sectorCounts).map(([name, value]) => ({ name, value }));
  }, [checklists]);

  const executionStatusData = useMemo(() => {
    const completed = executions.filter((e) => e.status === 'COMPLETED').length;
    const incomplete = executions.filter((e) => e.status === 'INCOMPLETE').length;

    return [
      { name: 'Concluídos', value: completed },
      { name: 'Incompletos', value: incomplete },
    ];
  }, [executions]);

  const todayExecutions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return executions.filter(
      (e) => e.completedAt?.startsWith?.(today) || new Date(e.completedAt).toISOString().startsWith(today)
    ).length;
  }, [executions]);

  const avgConformity = useMemo(() => {
    if (executions.length === 0) return 0;
    const total = executions.reduce((acc, e) => acc + (e.responses?.length || 0), 0);
    const ok = executions.reduce(
      (acc, e) => acc + (e.responses?.filter((r) => r.isOk).length || 0),
      0
    );
    return total > 0 ? Math.round((ok / total) * 100) : 0;
  }, [executions]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted/30 animate-pulse rounded-xl h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Conformidade (Últimos 7 dias)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={conformityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="conformidade"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
                name="Conformidade %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Execuções por Dia</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conformityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="executado" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Execuções" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Checklists por Setor</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {sectorData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Status Geral</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={executionStatusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {executionStatusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default ChecklistDashboard;