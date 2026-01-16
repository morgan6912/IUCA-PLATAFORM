import React, { useMemo, useState } from 'react';
import { Role } from '../../types';
import { useToast } from '../../components/shared/ToastProvider';
import { createUser } from '../../services/adminService';
import { persistPassword } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

const CreateUserPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.ESTUDIANTE);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoPassword, setAutoPassword] = useState('');

  const rosterSummary = useMemo(() => {
    if (!name && !email) return null;
    return `${name.trim() || 'Nuevo usuario'} · ${email.trim() || 'correo pendiente'}`;
  }, [name, email]);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@$%*';
    const random = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setPassword(random);
    setConfirm(random);
    setAutoPassword(random);
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Completa nombre y correo.');
      return;
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const created = await createUser(name.trim(), email.trim(), role);
      await persistPassword(created.id, created.email, password);
      showToast('Usuario creado con contraseña personalizada.', 'success');
        setName('');
        setEmail('');
        setPassword('');
        setConfirm('');
        setRole(Role.ESTUDIANTE);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError('Hubo un problema al crear el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Crear usuario administrativo</h1>
          <p className="text-sm text-slate-500">
            Genera usuarios con contraseña definida y asignales el rol adecuado. El sistema guardará la contraseña en la base de datos local.
          </p>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-semibold text-slate-500">Nombre completo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="María Pérez"
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Correo institucional</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@iuca.edu.mx"
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              type="email"
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value={Role.ESTUDIANTE}>Estudiante</option>
                <option value={Role.DOCENTE}>Docente</option>
                <option value={Role.ADMINISTRATIVO}>Administrativo</option>
                <option value={Role.DIRECTIVO}>Directivo</option>
                <option value={Role.BIBLIOTECARIO}>Bibliotecario</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crea una contraseña segura"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
              <div className="flex items-center justify-between mt-2 text-xs">
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-emerald-600 font-semibold"
                >
                  Generar contraseña segura
                </button>
                {autoPassword && (
                  <span className="text-slate-500">Sugerida: {autoPassword}</span>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              required
            />
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Creando...' : 'Crear usuario y establecer contraseña'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default CreateUserPage;
