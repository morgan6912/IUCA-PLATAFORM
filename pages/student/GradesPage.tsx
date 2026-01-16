import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getAcademicHistory, getGPA, HistoryRecord } from '../../services/academicService';

const StudentGradesPage: React.FC = () => {
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
      <h1 className="text-3xl font-bold text-slate-800">Calificaciones</h1>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Resumen</h2>
          {gpa !== null && <span className="text-sm text-slate-600">Promedio general: <strong>{gpa}</strong></span>}
        </div>
        <ul className="divide-y divide-slate-200">
          {history.map(h => (
            <li key={h.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{h.code} — {h.name}</p>
                <p className="text-sm text-slate-500">{h.semester} · {h.credits} créditos</p>
              </div>
              <span className="text-sm font-semibold text-slate-800">{h.grade}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StudentGradesPage;
