import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getAcademicHistory, getGPA, HistoryRecord } from '../../services/academicService';

const StudentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = React.useState<HistoryRecord[]>([]);
  const [gpa, setGpa] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!user) return;
    getAcademicHistory(user.id).then(setHistory);
    getGPA(user.id).then(setGpa);
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Historial Académico</h1>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Materias cursadas</h2>
          {gpa !== null && <span className="text-sm text-slate-600">Promedio general: <strong>{gpa}</strong></span>}
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Código</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Asignatura</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Semestre</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Créditos</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Nota</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {history.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-2 text-sm text-slate-700">{h.code}</td>
                <td className="px-4 py-2 text-sm text-slate-700">{h.name}</td>
                <td className="px-4 py-2 text-sm text-slate-700">{h.semester}</td>
                <td className="px-4 py-2 text-sm text-slate-700">{h.credits}</td>
                <td className="px-4 py-2 text-sm text-slate-700">{h.grade}</td>
                <td className="px-4 py-2 text-sm">
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">{h.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentHistoryPage;
