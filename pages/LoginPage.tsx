import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role, User } from '../types';
import { ArrowRight, Mail, Key, Eye, EyeOff, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import iucaLogo from '../assets/iuca-logo.svg';
import iucaFullLogo from '../assets/iuca-full-logo.png';
import iucaBanner from '../assets/iuca-banner.png';
import iucaColibri from '../assets/iuca-colibri.png';
import { useToast } from '../components/shared/ToastProvider';
import { listUsers, createUserRecord } from '../services/userService';
import { persistPassword, verifyPassword } from '../services/authService';
import { supabase } from '../supabaseClient';

const REGISTRATION_COUNTER_KEY = 'iuca-registration-counter';

const incrementRegistrationCounter = (): number => {
  if (typeof window === 'undefined') return 1;
  const current = Number(localStorage.getItem(REGISTRATION_COUNTER_KEY) || '0');
  const next = current + 1;
  localStorage.setItem(REGISTRATION_COUNTER_KEY, String(next));
  return next;
};

const buildMatricula = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const counter = String(incrementRegistrationCounter()).padStart(3, '0');
  return `IUCA${year}${month}${day}${counter}`;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeRoleValue = (value: string | Role): Role => {
  const normalized = String(value ?? '').trim().toLowerCase();
  const roleValues = Object.values(Role) as Role[];
  return roleValues.includes(normalized as Role) ? (normalized as Role) : Role.ESTUDIANTE;
};

const loginHighlights = [
  { icon: ShieldCheck, title: 'Seguridad reforzada', description: 'Cifrado de extremo a extremo y alertas en cada sesion.' },
  { icon: UserCheck, title: 'Acceso confiable', description: 'Recuerda tu cuenta para volver en segundos.' },
  { icon: Sparkles, title: 'Experiencia moderna', description: 'Interfaz fluida y responsiva con la identidad IUCA.' },
];


const roleLabels: Record<Role, string> = {
  [Role.ESTUDIANTE]: 'Estudiante',
  [Role.DOCENTE]: 'Docente',
  [Role.ADMINISTRATIVO]: 'Administrativo',
  [Role.DIRECTIVO]: 'Directivo',
  [Role.BIBLIOTECARIO]: 'Bibliotecario',
};

const quickRoles: Role[] = [
  Role.ESTUDIANTE,
  Role.DOCENTE,
  Role.ADMINISTRATIVO,
  Role.DIRECTIVO,
  Role.BIBLIOTECARIO,
];

const SKIP_SUPABASE_AUTH = (import.meta.env.VITE_SKIP_SUPABASE_AUTH as string | undefined)?.toLowerCase() === 'true';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const roleSummary = useMemo(() => {
    const baseCounts = quickRoles.reduce(
      (acc, role) => ({ ...acc, [role]: 0 }),
      {} as Record<Role, number>
    );
    const counts = availableUsers.reduce((acc, user) => {
      const normalizedRole = normalizeRoleValue(user.role);
      return {
        ...acc,
        [normalizedRole]: (acc[normalizedRole] ?? 0) + 1,
      };
    }, baseCounts);
    return {
      counts,
      total: availableUsers.length,
    };
  }, [availableUsers]);

  const loadUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const list = await listUsers();
      setAvailableUsers(list);
    } catch (err) {
      console.error(err);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Detectar flujo de recuperación de contraseña (Supabase agrega type=recovery en el hash)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        setMode('reset');
      }
    }
  }, []);

  const syncUserRecord = async (user: { id: string; name: string; email: string; role: Role }) => {
    try {
      await createUserRecord(user as User);
    } catch (err) {
      console.error('No se pudo sincronizar usuario', err);
    }
  };

  const reconcileWithBackend = async (candidate: User): Promise<User> => {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (!apiUrl) return candidate;
    try {
      const res = await fetch(`${apiUrl}/users?email=${encodeURIComponent(candidate.email)}`, { credentials: 'include' });
      if (!res.ok) return candidate;
      const list = (await res.json()) as any[];
      const match = Array.isArray(list) && list.length > 0 ? list[0] : null;
      if (!match) return candidate;
      // Usa el id/rol/nombre que tenga el backend para que coincida con module_assignments.student_ids
      return {
        ...candidate,
        id: match.id || candidate.id,
        role: normalizeRoleValue(match.role || candidate.role),
        name: match.name || candidate.name,
      };
    } catch {
      return candidate;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (SKIP_SUPABASE_AUTH) {
      const user = availableUsers.find((u) => normalizeEmail(u.email) === normalizeEmail(email));
      if (!user) {
        setError('Usuario no registrado.');
        return;
      }
      const ok = await verifyPassword(user.id, user.email, password.trim());
      if (!ok) {
        setError('Credenciales incorrectas.');
        return;
      }
      login(user);
      showToast('Sesion iniciada', 'success');
      navigate('/dashboard');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    if (error || !data.user) {
      setError('Credenciales incorrectas o usuario no registrado.');
      return;
    }
    setError('');
    const authUser = data.user;
    let normalizedUser = {
      id: authUser.id,
      name: (authUser.user_metadata as any)?.name || authUser.email?.split('@')[0] || 'Usuario',
      email: authUser.email || '',
      role: normalizeRoleValue((authUser.user_metadata as any)?.role || Role.ESTUDIANTE),
    } as User;
    normalizedUser = await reconcileWithBackend(normalizedUser);
    await syncUserRecord(normalizedUser);
    login(normalizedUser);
    showToast('Sesion iniciada', 'success');
    navigate('/dashboard');
  };

  const resetRegisterForm = () => {
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirm('');
    setRegisterError('');
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Escribe tu correo para enviarte el enlace.');
      return;
    }
    try {
      const redirectTo = `${window.location.origin}/#/login`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setError('');
      showToast('Revisa tu correo para restablecer la contraseña.', 'success');
      setMode('reset');
    } catch (err) {
      console.error(err);
      setError('No se pudo enviar el enlace. Intenta más tarde.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword.length < 4) {
      setResetError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: resetPassword });
      if (updErr) {
        setResetError(updErr.message);
        return;
      }
      setResetError('');
      showToast('Contraseña actualizada. Inicia sesión.', 'success');
      setMode('login');
    } catch (err) {
      console.error(err);
      setResetError('No se pudo actualizar la contraseña.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim()) {
      setRegisterError('Completa nombre y correo.');
      return;
    }
    if (registerPassword.length < 4) {
      setRegisterError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (registerPassword !== registerConfirm) {
      setRegisterError('Las contraseñas no coinciden.');
      return;
    }
    try {
      if (SKIP_SUPABASE_AUTH) {
        const userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `u-${Date.now()}`;
        const normalizedUser: User = {
          id: userId,
          name: registerName.trim(),
          email: registerEmail.trim(),
          role: Role.ESTUDIANTE,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(registerName.trim())}&background=2E7D32&color=ffffff`,
          matricula: buildMatricula(),
        };
        await persistPassword(userId, registerEmail.trim(), registerPassword);
        await syncUserRecord(normalizedUser);
        login(normalizedUser);
        showToast('Registro completo. Sesión iniciada.', 'success');
        resetRegisterForm();
        navigate('/dashboard');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: registerEmail.trim(),
        password: registerPassword,
        options: { data: { name: registerName.trim(), role: Role.ESTUDIANTE } },
      });
      if (error) {
        setRegisterError(error.message);
        return;
      }

      // Si Supabase no devuelve sesión (confirmación de correo), intentamos login inmediato
      if (!data.session) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: registerEmail.trim(),
          password: registerPassword,
        });
        if (loginError || !loginData.user) {
          setRegisterError('Cuenta creada. Revisa tu correo o intenta iniciar sesión.');
          return;
        }
        data.user = loginData.user;
      }

      if (data.user) {
        let normalizedUser: User = {
          id: data.user.id,
          name: registerName.trim(),
          email: registerEmail.trim(),
          role: Role.ESTUDIANTE,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(registerName.trim())}&background=2E7D32&color=ffffff`,
          matricula: buildMatricula(),
        };
        normalizedUser = await reconcileWithBackend(normalizedUser);
        await syncUserRecord(normalizedUser);
        login(normalizedUser);
        showToast('Registro completo. Sesión iniciada.', 'success');
        resetRegisterForm();
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setRegisterError('No se pudo crear la cuenta. Intenta mas tarde.');
    }
  };

  const quickLogin = (user: User) => {
    login(user);
    navigate('/dashboard');
  };

  const quickLoginByRole = async (role: Role) => {
    const user = availableUsers.find((u) => u.role === role);
    if (user) {
      quickLogin(user);
      return;
    }
    showToast('Crea primero un usuario con ese rol.', 'info');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f6b24] via-[#0c7c61] to-[#0c3f8f]" />
      <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gradient-to-br from-[#0a5a1e]/80 via-[#0c7c61]/60 to-transparent blur-[140px]" />
      <div className="absolute -bottom-12 -left-12 h-80 w-80 rounded-full bg-gradient-to-br from-[#0c7c61]/80 via-[#0c3f8f]/60 to-transparent blur-[160px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-stretch">
        <section className="flex flex-1 flex-col justify-between rounded-[36px] border border-slate-100 bg-white p-8 text-slate-800 shadow-2xl shadow-black/10">
          <header className="space-y-5">
            <div className="flex items-center gap-3">
              <img src={iucaFullLogo} alt="Instituto Universitario de Ciencias Ambientales" className="h-14 w-auto drop-shadow-md" />
              <div className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                Bienvenido
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-snug">
              Un acceso, toda la experiencia académica IUCA
            </h1>
            <p className="text-base leading-relaxed text-slate-600 max-w-xl">
              Coordina inscripciones, supervisa avances y comunica novedades desde un único entorno diseñado para estudiantes,
              docentes y gestores institucionales.
            </p>
            <div className="rounded-3xl border border-slate-100 bg-white p-4 text-center shadow-md">
              <img src={iucaBanner} alt="Instituto Universitario de Ciencias Ambientales" className="mx-auto h-16 w-full max-w-xl object-contain" />
            </div>
          </header>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {loginHighlights.map((highlight, index) => (
              <article
                key={`highlight-${highlight.title}`}
                className={`rounded-3xl border border-slate-100 p-4 text-slate-700 shadow-md ${
                  index % 2 === 0 ? 'bg-gradient-to-br from-white to-[#e6f7ff]' : 'bg-gradient-to-br from-white to-[#e7f8ef]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-iuca-blue-600 shadow">
                    <highlight.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{highlight.title}</p>
                    <p className="text-sm text-slate-600">{highlight.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            <span className="rounded-2xl border border-slate-200 px-3 py-2 text-center">Soporte 24/7</span>
            <span className="rounded-2xl border border-slate-200 px-3 py-2 text-center">Diseño inclusivo</span>
            <span className="rounded-2xl border border-slate-200 px-3 py-2 text-center">Actualizaciones rápidas</span>
          </div>
        </section>

        <section className="relative flex flex-1 flex-col gap-6 rounded-[36px] border border-slate-100 bg-white p-8 text-slate-900 shadow-2xl shadow-black/10">
          <div className="absolute -top-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white bg-white px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500 shadow-lg">
            <Sparkles className="h-4 w-4 text-iuca-blue-600" />
            Acceso verificado
          </div>
          <header className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Instituto Universitario de Ciencias Ambientales</p>
                <h2 className="text-3xl font-bold text-slate-900">Portal de acceso</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1 text-[11px] uppercase tracking-[0.4em] text-slate-500">
                <ShieldCheck className="h-4 w-4 text-iuca-green-700" />
                SSO IUCA
              </div>
            </div>
            {loadingUsers && (
              <p className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-iuca-blue-600">
                <span className="h-2 w-2 animate-ping rounded-full bg-iuca-blue-600" />
                Actualizando registro institucional...
              </p>
            )}
          </header>

            <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-white shadow-md text-iuca-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
              >
              Iniciar sesion
            </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${mode === 'register' ? 'bg-white shadow-md text-iuca-green-700' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Crear cuenta estudiante
              </button>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${mode === 'reset' ? 'bg-white shadow-md text-amber-700' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Recuperar contraseña
              </button>
          </div>

          {mode === 'login' ? (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-semibold text-slate-600">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-11 pr-3 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                    placeholder="nombre@iuca.com"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-semibold text-slate-600">
                  Contrasena
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Key className="h-5 w-5" />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-11 pr-11 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                    placeholder="********"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label="Mostrar contrasena"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-slate-300 text-iuca-green-600 focus:ring-iuca-green-500"
                  />
                  Recordarme
                </label>
                <button
                  type="button"
                  onClick={(e) => handleRequestReset(e)}
                  className="font-semibold text-iuca-blue-600 hover:text-iuca-blue-500"
                >
                  Olvidaste tu contrasena?
                </button>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-iuca-green-600 to-iuca-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-iuca-blue-500/30 transition hover:scale-[1.01]"
              >
                Iniciar sesion
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-slate-400">
                Pista para demos: <span className="font-semibold text-slate-600">password</span>
              </p>
            </form>
          ) : mode === 'register' ? (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="flex justify-center">
                <img src={iucaColibri} alt="Identidad IUCA" loading="lazy" className="h-16 w-auto drop-shadow-md" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-600">Nombre completo</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                    placeholder="Maria Perez"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Email</label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Esta cuenta se crea solo como estudiante. La matrícula digital se genera automáticamente.
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-600">Contrasena</label>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                    placeholder="Crea tu clave"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Confirmar</label>
                  <input
                    type="password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                    placeholder="Repite la clave"
                    required
                  />
                </div>
              </div>
              {registerError && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{registerError}</p>}
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-iuca-green-600 to-iuca-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-iuca-blue-500/30 transition hover:scale-[1.01]"
              >
                Crear cuenta y obtener matricula
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Nueva contraseña</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                  placeholder="Escribe tu nueva clave"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Confirmar contraseña</label>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm shadow-inner focus:border-iuca-blue-500 focus:ring-iuca-blue-200"
                  placeholder="Repite la nueva clave"
                  required
                />
              </div>
              {resetError && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{resetError}</p>}
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-600 to-iuca-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-iuca-blue-500/30 transition hover:scale-[1.01]"
              >
                Guardar nueva contraseña
              </button>
              <p className="text-xs text-slate-500">
                Primero solicita el enlace desde "Iniciar sesión" &rarr; "Recuperar contraseña". Cuando el enlace te traiga de vuelta (type=recovery), coloca tu nueva clave aquí.
              </p>
            </form>
          )}

          <section className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Acceso rapido por rol</p>
              <span className="text-xs uppercase tracking-[0.4em] text-slate-400">Demo ready</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              {quickRoles.map((role) => (
                <button
                  key={`quick-role-${role}`}
                  onClick={() => quickLoginByRole(role)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-left font-semibold text-slate-600 transition hover:border-iuca-green-400 hover:bg-white hover:text-iuca-green-700"
                  disabled={loadingUsers}
                >
                  <span className="block text-xs uppercase tracking-[0.4em] text-slate-400">{roleLabels[role]}</span>
                  <span className="text-lg text-slate-800">{roleSummary.counts[role] ?? 0}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-slate-400">
              Si el rol no existe, se genera un usuario demo automaticamente al solicitar acceso.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
