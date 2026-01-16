import React from 'react';
import { useToast } from '../components/shared/ToastProvider';
import { Clock3, CheckCircle2, AlertCircle, X } from 'lucide-react';

type EmployeeRecord = {
  id: string;
  nombre: string;
  clave: string;
  turno: 'matutino' | 'vespertino';
  funciones: string[];
};

const EMPLOYEES: EmployeeRecord[] = [
  { id: 'e1', nombre: 'Ana López', clave: 'EMP-001', turno: 'matutino', funciones: ['Horas frente a grupo', 'Psicólogo'] },
  { id: 'e2', nombre: 'Carlos Pérez', clave: 'EMP-002', turno: 'vespertino', funciones: ['Director'] },
  { id: 'e3', nombre: 'Lucía Martínez', clave: 'EMP-003', turno: 'matutino', funciones: ['Doctor', 'Horas frente a grupo'] },
  { id: 'e4', nombre: 'Jorge Ramírez', clave: 'EMP-004', turno: 'vespertino', funciones: ['Horas frente a grupo'] },
];

const FUNCTION_OPTIONS = ['Horas frente a grupo', 'Director', 'Psicólogo', 'Doctor'];

const AdminPersonalHoursPage: React.FC = () => {
  const { showToast } = useToast();
  const [estadoEmpleado, setEstadoEmpleado] = React.useState<'activo' | 'receso'>('activo');
  const [nombreEmpleado, setNombreEmpleado] = React.useState('');
  const [claveEmpleado, setClaveEmpleado] = React.useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = React.useState<EmployeeRecord | null>(null);
  const [funcionAsignada, setFuncionAsignada] = React.useState('');
  const [horasAsignadas, setHorasAsignadas] = React.useState(0);
  const [plantilla, setPlantilla] = React.useState<
    { id: string; empleado: EmployeeRecord; horas: number; funcion: string }[]
  >([]);

  const manejarEstado = (nuevo: 'activo' | 'receso') => {
    setEstadoEmpleado(nuevo);
    showToast(`Estado del empleado: ${nuevo === 'activo' ? 'Activo' : 'Receso'}`, nuevo === 'activo' ? 'success' : 'info');
  };

  const limpiarFormulario = () => {
    setNombreEmpleado('');
    setClaveEmpleado('');
    setEmpleadoSeleccionado(null);
    setFuncionAsignada('');
    setHorasAsignadas(0);
  };

  const validarEmpleado = () => {
    const encontrado = EMPLOYEES.find(
      (emp) =>
        emp.nombre.toLowerCase() === nombreEmpleado.trim().toLowerCase() &&
        emp.clave.toLowerCase() === claveEmpleado.trim().toLowerCase(),
    );
    if (!encontrado) {
      setEmpleadoSeleccionado(null);
      showToast('No empleado', 'error');
      return;
    }
    setEmpleadoSeleccionado(encontrado);
    setFuncionAsignada(encontrado.funciones[0] || FUNCTION_OPTIONS[0]);
    showToast(`Empleado ${encontrado.nombre} validado`, 'success');
  };

  const agregarPlantilla = () => {
    if (estadoEmpleado !== 'activo') {
      showToast('El empleado debe estar activo para cargar horario', 'error');
      return;
    }
    if (!empleadoSeleccionado) {
      showToast('Valida un empleado antes de ubicar', 'error');
      return;
    }
    if (!funcionAsignada) {
      showToast('Selecciona la función', 'error');
      return;
    }
    if (horasAsignadas <= 0) {
      showToast('Ingresa horas válidas', 'error');
      return;
    }
    setPlantilla((prev) => [
      ...prev,
      { id: `${Date.now()}`, empleado: empleadoSeleccionado, horas: horasAsignadas, funcion: funcionAsignada },
    ]);
    showToast('Horario agregado a plantilla', 'success');
  };

  const registrarHorario = () => {
    if (!plantilla.length) {
      showToast('No hay horarios por registrar', 'error');
      return;
    }
    if (estadoEmpleado !== 'activo') {
      showToast('El empleado debe estar activo para registrar', 'error');
      return;
    }
    setPlantilla([]);
    setHorasAsignadas(0);
    setFuncionAsignada('');
    setEmpleadoSeleccionado(null);
    showToast('Horario registrado correctamente', 'success');
  };

  const eliminarElemento = (id: string) => {
    setPlantilla((prev) => prev.filter((registro) => registro.id !== id));
  };

  const totalHoras = React.useMemo(() => plantilla.reduce((acum, registro) => acum + registro.horas, 0), [plantilla]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Personal · Carga de horarios</h1>
        <p className="text-sm text-slate-500">
          Sigue los pasos para validar al empleado, asignar horas y registrar el horario en la plantilla.
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Paso 1</p>
            <h2 className="text-lg font-semibold text-slate-900">Estado del empleado</h2>
            <p className="text-sm text-slate-500">
              Define si el empleado está disponible para recibir horarios.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => manejarEstado('activo')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold border ${
                estadoEmpleado === 'activo' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-emerald-600 border-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Activo
            </button>
            <button
              onClick={() => manejarEstado('receso')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold border ${
                estadoEmpleado === 'receso' ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-white text-rose-600 border-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4" /> Receso
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-slate-100 p-4 bg-slate-50">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Selección de empleado</p>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Nombre del empleado"
              value={nombreEmpleado}
              onChange={(e) => setNombreEmpleado(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Clave (ej. EMP-001)"
              value={claveEmpleado}
              onChange={(e) => setClaveEmpleado(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={validarEmpleado}
                className="rounded-xl bg-iuca-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-iuca-blue-700 transition"
              >
                Validar empleado
              </button>
              <button
                onClick={limpiarFormulario}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Limpiar
              </button>
            </div>
            {!empleadoSeleccionado && (
              <p className="text-xs text-slate-500">Si no coincide nombre y clave, mostramos el mensaje “No empleado”.</p>
            )}
            {empleadoSeleccionado && (
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  {empleadoSeleccionado.nombre} · {empleadoSeleccionado.clave}
                </p>
                <p>Turno: {empleadoSeleccionado.turno === 'matutino' ? 'Matutino' : 'Vespertino'}</p>
                <p>Funciones: {empleadoSeleccionado.funciones.join(', ')}</p>
              </div>
            )}
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Asignación</p>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex flex-col text-sm text-slate-700">
                Número de horas
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={horasAsignadas}
                  onChange={(e) => setHorasAsignadas(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col text-sm text-slate-700">
                Función
                <select
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={funcionAsignada}
                  onChange={(e) => setFuncionAsignada(e.target.value)}
                >
                  <option value="">Selecciona función</option>
                  {FUNCTION_OPTIONS.map((funcion) => (
                    <option key={funcion} value={funcion}>
                      {funcion}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              onClick={agregarPlantilla}
              className="inline-flex items-center gap-2 rounded-xl bg-iuca-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-iuca-green-700"
            >
              <Clock3 className="w-4 h-4" />
              Ubicar (agregar a plantilla)
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Plantilla</p>
            <p className="text-sm text-slate-600">Controla horas, funciones y empleados antes de registrar.</p>
          </div>
          <span className="text-sm font-semibold text-slate-700">Horas totales: {totalHoras}</span>
        </div>
        {plantilla.length === 0 && <p className="text-sm text-slate-500">No hay registros en la plantilla.</p>}
        <div className="space-y-2">
          {plantilla.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {item.empleado.nombre} ({item.empleado.clave})
                </p>
                <p className="text-slate-600 capitalize">Turno {item.empleado.turno}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-1 border border-indigo-100">{item.funcion}</span>
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 border border-emerald-100">{item.horas} h</span>
                <button
                  onClick={() => eliminarElemento(item.id)}
                  className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-white transition"
                  aria-label="Eliminar registro"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={registrarHorario}
            className="rounded-xl bg-iuca-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-iuca-blue-700"
          >
            Registrar horario
          </button>
          <button
            onClick={() => setPlantilla([])}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Vaciar plantilla
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminPersonalHoursPage;
