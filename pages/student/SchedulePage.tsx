import React from 'react';
import { useCourses } from '../../hooks/useCourses';
import { useAuth } from '../../hooks/useAuth';
import { listModuleAssignments } from '../../services/moduleAssignmentService';
import { Role } from '../../types';

type DayCode = 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D';

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

const StudentSchedulePage: React.FC = () => {
  const { myCourses, loading } = useCourses();
  const { user } = useAuth();
  const [studentModules, setStudentModules] = React.useState<ModuloAsignado[]>([]);

  const dayNames: Record<DayCode, string> = {
    L: 'Lunes',
    M: 'Martes',
    X: 'Miércoles',
    J: 'Jueves',
    V: 'Viernes',
    S: 'Sábado',
    D: 'Domingo',
  };
  const fullDayOrder: DayCode[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const toMinutes = (time: string, ampm: string) => {
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    const isPM = ampm.toLowerCase() === 'pm';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  };

  const STEP = 30; // minutos por fila

  React.useEffect(() => {
    const loadModules = async () => {
      if (!user || user.role !== Role.ESTUDIANTE) return;
      const studentId = user.id;
      try {
        const assignments = await listModuleAssignments();
        const mine: ModuloAsignado[] = [];
        for (const mod of assignments) {
          const assigned = Array.isArray(mod.studentIds) ? mod.studentIds : [];
          if (assigned.includes(studentId)) {
            mine.push(mod);
            continue;
          }
        }
        setStudentModules(mine);
      } catch {
        setStudentModules([]);
      }
    };
    loadModules();
  }, [user]);

  const events = React.useMemo(() => {
    const evs: {
      day: DayCode;
      code: string;
      name: string;
      room?: string;
      start: number;
      end: number;
      startRow: number;
      endRow: number;
      rows: number;
    }[] = [];
    // Cursos
    for (const c of myCourses) {
      const m = c.schedule.match(/([LMXJVSD](?:-[LMXJVSD])*)\s+(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)(am|pm)/i);
      if (!m) continue;
      const days = m[1].split('-') as DayCode[];
      const startStr = m[2];
      const endStr = m[3];
      const ampm = m[4];
      const start = toMinutes(startStr, ampm);
      const end = toMinutes(endStr, ampm);
      const startRow = Math.floor(start / STEP) * STEP;
      const endRow = Math.ceil(end / STEP) * STEP;
      const rows = Math.max(1, (endRow - startRow) / STEP);
      for (const d of days) {
        evs.push({ day: d, code: c.code, name: c.name, room: c.room, start, end, startRow, endRow, rows });
      }
    }
    // Módulos asignados (24h)
    const dayMap: Record<string, DayCode> = {
      Lunes: 'L',
      Martes: 'M',
      Miércoles: 'X',
      Miercoles: 'X',
      Jueves: 'J',
      Viernes: 'V',
      Sábado: 'S',
      Sabado: 'S',
      Domingo: 'D',
    };
    const abbrMap: Record<string, DayCode> = {
      Lu: 'L',
      Ma: 'M',
      Mi: 'X',
      Ju: 'J',
      Vi: 'V',
      Sa: 'S',
      Do: 'D',
    };
    const toMin24 = (hhmm: string) => {
      const [hh, mm] = hhmm.split(':').map(Number);
      return hh * 60 + (mm || 0);
    };
    studentModules.forEach((mod) => {
      mod.modulo.materias.forEach((m) => {
        Object.entries(m.horario).forEach(([dia, rango]) => {
          const d = dayMap[dia];
          // Fallback: clave "Horario" con formato "Lu-Ma-Mi 09:00-13:00"
          if (!d && dia.toLowerCase() === 'horario') {
            const match = rango.match(/([A-Za-z]{2}(?:-[A-Za-z]{2})*)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (!match) return;
            const days = match[1].split('-');
            const start = toMin24(match[2]);
            const end = toMin24(match[3]);
            const startRow = Math.floor(start / STEP) * STEP;
            const endRow = Math.ceil(end / STEP) * STEP;
            const rows = Math.max(1, (endRow - startRow) / STEP);
            days.forEach((abbr) => {
              const dayCode = abbrMap[abbr] || dayMap[abbr];
              if (!dayCode) return;
              evs.push({
                day: dayCode,
                code: `${mod.modulo.codigo}-${m.clave}`,
                name: m.nombre,
                start,
                end,
                startRow,
                endRow,
                rows,
              });
            });
            return;
          }
          if (!d) return;
          const [startStr, endStr] = rango.split('-');
          if (!startStr || !endStr) return;
          const start = toMin24(startStr);
          const end = toMin24(endStr);
          const startRow = Math.floor(start / STEP) * STEP;
          const endRow = Math.ceil(end / STEP) * STEP;
          const rows = Math.max(1, (endRow - startRow) / STEP);
          evs.push({
            day: d,
            code: `${mod.modulo.codigo}-${m.clave}`,
            name: m.nombre,
            start,
            end,
            startRow,
            endRow,
            rows,
          });
        });
      });
    });
    return evs;
  }, [myCourses, studentModules]);

  const [minTime, maxTime] = React.useMemo(() => {
    const defaultRange: [number, number] = [8 * 60, 20 * 60];
    if (events.length === 0) return defaultRange;
    let min = Math.min(...events.map((e) => e.start));
    let max = Math.max(...events.map((e) => e.end));
    min = Math.max(8 * 60, Math.floor(min / STEP) * STEP);
    max = Math.min(21 * 60, Math.ceil(max / STEP) * STEP);
    return [min, max];
  }, [events]);

  const hours: number[] = React.useMemo(() => {
    const arr: number[] = [];
    for (let t = minTime; t <= maxTime; t += STEP) arr.push(t);
    return arr;
  }, [minTime, maxTime]);

  const fmtHour = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = ((h + 11) % 12) + 1;
    const mm = m.toString().padStart(2, '0');
    return `${h12}:${mm}${ampm}`;
  };

  const eventsByStart = React.useMemo(() => {
    const map = new Map<string, (typeof events)[number]>();
    events.forEach((ev) => map.set(`${ev.day}-${ev.startRow}`, ev));
    return map;
  }, [events]);

  const occupied = React.useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      for (let t = ev.startRow + STEP; t < ev.endRow; t += STEP) {
        set.add(`${ev.day}-${t}`);
      }
    });
    return set;
  }, [events]);

  const colorFor = (code: string) => {
    const palette = [
      'bg-emerald-100 text-emerald-800 border-emerald-300',
      'bg-sky-100 text-sky-800 border-sky-300',
      'bg-amber-100 text-amber-800 border-amber-300',
      'bg-violet-100 text-violet-800 border-violet-300',
      'bg-rose-100 text-rose-800 border-rose-300',
      'bg-teal-100 text-teal-800 border-teal-300',
    ];
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };

  const daysToShow: DayCode[] = React.useMemo(() => {
    const hasWeekend = events.some((e) => e.day === 'S' || e.day === 'D');
    return hasWeekend ? fullDayOrder : (fullDayOrder.slice(0, 5) as DayCode[]);
  }, [events]);

  const todayIndex = React.useMemo(() => {
    const today = new Date().getDay();
    switch (today) {
      case 0:
        return fullDayOrder.indexOf('D');
      case 6:
        return fullDayOrder.indexOf('S');
      case 5:
        return fullDayOrder.indexOf('V');
      case 4:
        return fullDayOrder.indexOf('J');
      case 3:
        return fullDayOrder.indexOf('X');
      case 2:
        return fullDayOrder.indexOf('M');
      case 1:
      default:
        return fullDayOrder.indexOf('L');
    }
  }, [fullDayOrder]);

  const todayDay = fullDayOrder[todayIndex] ?? 'L';

  const weeklyLoad = React.useMemo(() => {
    const map: Record<DayCode, number> = { L: 0, M: 0, X: 0, J: 0, V: 0, S: 0, D: 0 };
    events.forEach((event) => {
      const hours = (event.end - event.start) / 60;
      map[event.day] = (map[event.day] || 0) + hours;
    });
    return map;
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-800">Horario y Aulas</h1>
        <p className="text-sm text-slate-500">
          Visualiza tu semana acad&eacute;mica con los bloques de clases y los m&oacute;dulos asignados.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          {(['L', 'M', 'X', 'J', 'V'] as DayCode[]).map((day) => (
            <span key={day} className="bg-slate-100 px-3 py-1 rounded-full">
              {dayNames[day]} • {weeklyLoad[day]?.toFixed(1)}h
            </span>
          ))}
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md">
        {loading ? (
          <div>Cargando...</div>
        ) : myCourses.length === 0 && studentModules.length === 0 ? (
          <p className="text-slate-600">A&uacute;n no tienes cursos ni m&oacute;dulos asignados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left text-slate-600">Hora</th>
                  {daysToShow.map((d) => {
                    const isToday = todayDay === d;
                    return (
                      <th
                        key={d}
                        className={`px-3 py-2 text-left text-slate-600 ${isToday ? 'text-iuca-blue-600' : ''}`}
                      >
                        {dayNames[d]}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {hours.map((h) => (
                  <tr key={h}>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap align-top">{fmtHour(h)}</td>
                    {daysToShow.map((d) => {
                      const key = `${d}-${h}`;
                      const ev = eventsByStart.get(key);
                      if (ev) {
                        return (
                          <td
                            key={key}
                            className={`px-3 py-2 align-top ${todayDay === d ? 'bg-iuca-blue-50' : ''}`}
                            rowSpan={ev.rows}
                          >
                            <div
                              className={`border rounded p-2 h-full ${colorFor(ev.code)}`}
                              style={{ minHeight: `${ev.rows * 28}px` }}
                            >
                              <div className="text-xs uppercase tracking-wide">{ev.code}</div>
                              <div className="text-sm font-semibold">{ev.name}</div>
                              <div className="text-xs text-slate-700">
                                {fmtHour(ev.start)} - {fmtHour(ev.end)}
                              </div>
                              {ev.room && <div className="text-xs">Aula: {ev.room}</div>}
                            </div>
                          </td>
                        );
                      }
                      if (occupied.has(key)) return null;
                      return <td key={key} className="px-3 py-2 align-top"></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-xs text-slate-500">
              Fuente:{' '}
              {[
                ...myCourses.map((c) => `${c.code} (${c.schedule})`),
                ...studentModules.map((m) => `${m.modulo.codigo} (módulo)`),
              ].join(' • ')}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Leyenda</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Map<string, string>([
                    ...myCourses.map((c) => [c.code, c.name] as [string, string]),
                    ...studentModules.flatMap((m) =>
                      m.modulo.materias.map((mat) => [`${m.modulo.codigo}-${mat.clave}`, mat.nombre] as [string, string]),
                    ),
                  ]),
                ).map(([code, name]) => (
                  <div key={code} className={`border rounded px-2 py-1 text-xs ${colorFor(code)}`}>
                    {code} • {name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSchedulePage;
