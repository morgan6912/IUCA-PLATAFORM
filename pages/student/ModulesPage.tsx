
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listModuleAssignments } from '../../services/moduleAssignmentService';
import { Role } from '../../types';

type ModuloMateria = {
  clave: string;
  nombre: string;
  horas: number;
  horario: Record<string, string>;
  observaciones?: string;
  modalidad: string;
  turno: string;
  grupo: string;
  semanas: number;
};

type ModuloAsignado = {
  id: string;
  profesorId: string;
  profesorNombre: string;
  modulo: {
    codigo: string;
    nombre: string;
    periodo: { inicio: string; fin: string; semanas: number; vacacional?: string; regularizacion?: string };
    materias: ModuloMateria[];
  };
  studentIds?: string[];
};

const StudentModulesPage: React.FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = React.useState<ModuloAsignado[]>([]);
  const [loading, setLoading] = React.useState(true);

  const readAdminCourseMap = React.useCallback(() => {
    return {};
  }, []);

  React.useEffect(() => {
    const load = async () => {
      if (!user) return;
      const studentId = user.id;
      setLoading(true);
      try {
        const assignments = await listModuleAssignments();
        const mine: ModuloAsignado[] = [];
        const courseMap = readAdminCourseMap();

        for (const mod of assignments) {
          const assigned = Array.isArray(mod.studentIds) ? mod.studentIds : [];
          if (assigned.includes(studentId)) {
            mine.push(mod as ModuloAsignado);
            continue;
          }
        }

        setModules(mine);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, readAdminCourseMap]);

  if (!user || user.role !== Role.ESTUDIANTE) return <div>Solo estudiantes.</div>;
  if (loading) return <div>Cargando m&oacute;dulos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mis m&oacute;dulos</p>
          <h1 className="text-3xl font-bold text-slate-800">M&oacute;dulos asignados</h1>
          <p className="text-sm text-slate-500">Los m&oacute;dulos que tu docente te asign&oacute; desde administraci&oacute;n.</p>
        </div>
        <span className="text-sm text-slate-500">{modules.length} m&oacute;dulo(s)</span>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          A&uacute;n no tienes m&oacute;dulos asignados. Consulta con tu docente o administrador.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((m) => (
            <article key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{m.modulo.codigo}</p>
                  <h2 className="text-lg font-semibold text-slate-900">{m.modulo.nombre}</h2>
                  <p className="text-xs text-slate-500">Profesor: {m.profesorNombre}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{m.modulo.periodo.inicio} - {m.modulo.periodo.fin}</p>
                  <p>{m.modulo.periodo.semanas} semanas</p>
                </div>
              </div>
              <div className="space-y-2">
                {m.modulo.materias.map((mat) => (
                  <div key={mat.clave} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{mat.clave} - {mat.nombre}</span>
                      <span className="text-xs text-slate-500">{mat.horas}h</span>
                    </div>
                    <p className="text-xs text-slate-500">Modalidad {mat.modalidad} | Turno {mat.turno} | Grupo {mat.grupo} | Semanas {mat.semanas}</p>
                    <p className="text-xs text-slate-500">
                      {Object.entries(mat.horario).map(([d, h]) => `${d}: ${h}`).join(' | ')}
                    </p>
                    {mat.observaciones && <p className="text-xs text-amber-700">Obs: {mat.observaciones}</p>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentModulesPage;
