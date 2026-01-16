// API de inscripciones con Supabase (Postgres + Storage)
// Usa las variables de entorno definidas en .env dentro de esta carpeta.

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'inscriptions';
// Bucket de biblioteca: por defecto usar "Library" (mayúscula) para coincidir con Supabase
const LIB_BUCKET = process.env.SUPABASE_LIBRARY_BUCKET || 'Library';
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_KEY en variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '25mb' }));

// Sincroniza la tabla pivote (si existe) para tener asignaciones alumno-módulo en filas reales
const syncAssignmentStudents = async (assignmentId, studentIds = []) => {
  try {
    await supabase.from('module_assignment_students').delete().eq('assignment_id', assignmentId);
    if (studentIds.length) {
      const rows = studentIds.map((sid) => ({ assignment_id: assignmentId, student_id: sid }));
      await supabase.from('module_assignment_students').insert(rows);
    }
  } catch (err) {
    console.warn('No se pudo sincronizar module_assignment_students; verifica que la tabla exista.', err?.message || err);
  }
};

// Generador simple de matrícula
const buildMatricula = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100); // 3 dígitos
  return `IUCA${year}${month}${day}${rand}`;
};

// Helper: genera URL firmada con fallback de bucket (Library/library) para evitar errores por mayúsculas/minúsculas
const signLibraryUrl = async (path) => {
  const bucketsToTry = [LIB_BUCKET, LIB_BUCKET === 'Library' ? 'library' : 'Library'];
  let lastError = null;
  for (const bucket of bucketsToTry) {
    if (!bucket) continue;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (!error) return { url: data?.signedUrl || null, bucket };
    lastError = error;
  }
  return { url: null, error: lastError };
};

app.get('/health', (_req, res) => res.json({ ok: true }));

// Usuarios
app.get('/users', async (req, res) => {
  const { email } = req.query;
  let query = supabase.from('users').select('*');
  if (email) query = query.ilike('email', String(email));
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/users', async (req, res) => {
  const { id, name, email, role, avatar_url, matricula } = req.body || {};
  if (!name || !email || !role) return res.status(400).json({ error: 'Faltan name/email/role' });
  const payload = {
    id: id || crypto.randomUUID(),
    name,
    email,
    role,
    avatar_url: avatar_url || null,
    matricula: matricula || buildMatricula(),
  };
  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'email' })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// Actualizar rol u otros campos de usuario (perfil, no credenciales)
app.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: 'Falta id' });
  const allowed = ['name', 'email', 'role', 'avatar_url', 'matricula'];
  const payload = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(payload).length) return res.status(400).json({ error: 'Nada que actualizar' });
  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// Helper: decodificar dataUrl a buffer + mime
const dataUrlToBuffer = (dataUrl) => {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl || '');
  if (!match) return null;
  const [, contentType, base64Data] = match;
  return {
    buffer: Buffer.from(base64Data, 'base64'),
    contentType: contentType || 'application/octet-stream',
  };
};

// Listado admin/directivo (filtra por status/search opcional)
app.get('/inscriptions/documents', async (req, res) => {
  const { status, search, userId } = req.query;
  let query = supabase.from('enrollment_documents').select('*').order('uploaded_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (userId) query = query.eq('user_id', userId);
  if (search) {
    query = query.or(`user_name.ilike.%${search}%,file_name.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

// Subida de documentos (JSON con dataUrl)
app.post('/inscriptions/documents', async (req, res) => {
  const { userId, userName, files } = req.body || {};
  if (!userId || !userName) return res.status(400).json({ error: 'Faltan userId o userName' });
  if (!Array.isArray(files) || !files.length) return res.status(400).json({ error: 'Sin archivos' });

  const uploadedAt = new Date().toISOString();
  const entries = [];

  for (const file of files) {
    const { name, size, type, dataUrl } = file;
    const decoded = dataUrlToBuffer(dataUrl);
    if (!decoded) return res.status(400).json({ error: `Archivo inválido: ${name}` });

    const path = `${userId}/${Date.now()}-${name}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, decoded.buffer, { contentType: decoded.contentType || type || 'application/octet-stream' });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);

    entries.push({
      id: crypto.randomUUID(),
      user_id: userId,
      user_name: userName,
      file_name: name,
      file_type: type || decoded.contentType || 'Documento',
      file_size: size,
      storage_path: path,
      download_url: signed?.signedUrl || null,
      status: 'pendiente',
      uploaded_at: uploadedAt,
    });
  }

  const { data, error } = await supabase.from('enrollment_documents').insert(entries).select('*').eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

// Actualizar estado (admin/directivo)
app.patch('/inscriptions/documents/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, reviewerId, reviewerName, remark } = req.body || {};
  if (!status || !reviewerId || !reviewerName) return res.status(400).json({ error: 'Faltan datos' });
  const { data, error } = await supabase
    .from('enrollment_documents')
    .update({
      status,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      reviewer_remark: remark || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// Borrar documento (opcional, estudiante)
app.delete('/inscriptions/documents/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body || {};
  const { data: doc } = await supabase.from('enrollment_documents').select('*').eq('id', id).single();
  const { error } = await supabase.from('enrollment_documents').delete().eq('id', id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  // Borra del storage si el archivo era del usuario
  if (doc?.storage_path && (!userId || userId === doc.user_id)) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  }
  return res.json({ ok: true });
});

// Gestión de módulos (asignaciones profesor + estudiantes)
app.get('/module-assignments', async (_req, res) => {
  const { data, error } = await supabase.from('module_assignments').select('*').order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/module-assignments', async (req, res) => {
  const { profesorId, profesorNombre, modulo, studentIds } = req.body || {};
  if (!profesorId || !profesorNombre || !modulo) return res.status(400).json({ error: 'Faltan datos' });
  let validatedStudents = [];
  if (Array.isArray(studentIds) && studentIds.length) {
    const { data: existing, error: usersError } = await supabase.from('users').select('id').in('id', studentIds);
    if (usersError) return res.status(500).json({ error: usersError.message });
    const existingIds = new Set((existing || []).map((u) => u.id));
    const missing = studentIds.filter((sid) => !existingIds.has(sid));
    if (missing.length) return res.status(400).json({ error: `Alumnos no encontrados: ${missing.join(', ')}` });
    validatedStudents = studentIds;
  }
  const payload = {
    profesor_id: profesorId,
    profesor_nombre: profesorNombre,
    modulo: modulo || null,
    student_ids: validatedStudents,
  };
  const { data, error } = await supabase.from('module_assignments').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await syncAssignmentStudents(data.id, validatedStudents);
  return res.json(data);
});

app.patch('/module-assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { profesorNombre, studentIds } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Falta id' });
  const payload = {};
  if (profesorNombre !== undefined) payload.profesor_nombre = profesorNombre;
  let validatedStudents = null;
  if (Array.isArray(studentIds)) {
    // Valida que todos los estudiantes existan para no guardar IDs huérfanos
    const { data: existing, error: usersError } = await supabase
      .from('users')
      .select('id')
      .in('id', studentIds);
    if (usersError) return res.status(500).json({ error: usersError.message });
    const existingIds = new Set((existing || []).map((u) => u.id));
    const missing = studentIds.filter((sid) => !existingIds.has(sid));
    if (missing.length) {
      return res.status(400).json({ error: `Alumnos no encontrados: ${missing.join(', ')}` });
    }
    validatedStudents = studentIds;
    payload.student_ids = validatedStudents;
  }
  const { data, error } = await supabase
    .from('module_assignments')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Asignación no encontrada' });
  if (validatedStudents !== null) await syncAssignmentStudents(id, validatedStudents);
  return res.json(data);
});

app.delete('/module-assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('module_assignments').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// Asistencia (presencial/mixta) por curso/alumno/fecha
app.get('/attendance', async (req, res) => {
  const { courseId, date } = req.query;
  let query = supabase.from('attendance_records').select('*');
  if (courseId) query = query.eq('course_id', String(courseId));
  if (date) query = query.eq('date', String(date));
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/attendance', async (req, res) => {
  const { courseId, studentId, date, present, note } = req.body || {};
  if (!courseId || !studentId || !date) return res.status(400).json({ error: 'Faltan courseId/studentId/date' });
  const payload = {
    course_id: courseId,
    student_id: studentId,
    date,
    present: present ?? false,
    note: note || null,
  };
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(payload, { onConflict: 'course_id,student_id,date' })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.patch('/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const { present, note } = req.body || {};
  if (present === undefined && note === undefined) return res.status(400).json({ error: 'Nada que actualizar' });
  const payload = {};
  if (present !== undefined) payload.present = present;
  if (note !== undefined) payload.note = note;
  const { data, error } = await supabase.from('attendance_records').update(payload).eq('id', id).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// Catálogo de módulos académicos
app.get('/modules', async (_req, res) => {
  const { data, error } = await supabase.from('modules').select('*').order('code', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/modules', async (req, res) => {
  const { code, name, schedule, hours, teacher_suggested, description } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'Faltan code/name' });
  const payload = {
    code,
    name,
    schedule: schedule || null,
    hours: hours ?? null,
    teacher_suggested: teacher_suggested || null,
    description: description || null,
  };
  const { data, error } = await supabase.from('modules').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.delete('/modules/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('modules').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// Comunicación interna
app.get('/communication/messages', async (_req, res) => {
  const { data, error } = await supabase
    .from('communication_messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/communication/messages', async (req, res) => {
  const { userId, userName, avatarUrl, text, attachmentUrl, attachmentName, toUserId, toUserName } = req.body || {};
  if (!userId || !userName || !text) return res.status(400).json({ error: 'Faltan campos requeridos' });
  const payload = {
    user_id: userId,
    user_name: userName,
    avatar_url: avatarUrl || null,
    text: text.trim(),
    attachment_url: attachmentUrl || null,
    attachment_name: attachmentName || null,
    to_user_id: toUserId || null,
    to_user_name: toUserName || null,
  };
  const { data, error } = await supabase.from('communication_messages').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// Biblioteca: items
app.get('/library/items', async (_req, res) => {
  const { data, error } = await supabase.from('library_items').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  // Regenerar URLs firmadas en cada petición para evitar expiración de tokens
  const refreshed =
    data && data.length
      ? await Promise.all(
          data.map(async (item) => {
            if (!item.file_storage_path) return item;
            const { data: signed, error: signedError } = await supabase.storage
              .from(LIB_BUCKET)
              .createSignedUrl(item.file_storage_path, 3600);
            if (signedError) {
              console.error('No se pudo generar URL firmada de biblioteca:', signedError.message);
              return { ...item, file_download_url: null };
            }
            return { ...item, file_download_url: signed?.signedUrl || null };
          }),
        )
      : [];

  return res.json(refreshed);
});

// Generar URL firmada fresca para una descarga puntual
app.get('/library/items/:id/download', async (req, res) => {
  const { id } = req.params;
  const { data: item, error } = await supabase.from('library_items').select('*').eq('id', id).single();
  if (error) return res.status(500).json({ error: error.message });
  if (!item) return res.status(404).json({ error: `Recurso no encontrado (id ${id})` });

  if (item.file_storage_path) {
    const { url, error: signedError } = await signLibraryUrl(item.file_storage_path);
    if (signedError || !url) {
      return res
        .status(500)
        .json({ error: signedError?.message || 'No se pudo generar URL firmada', detail: signedError || null });
    }
    return res.json({ url });
  }

  // Fallback solo si no hay archivo en storage (ej. enlace externo)
  if (item.file_download_url) {
    return res.json({ url: item.file_download_url });
  }

  console.warn('Descarga sin archivo en storage ni URL', { id: item.id, title: item.title });
  return res.status(400).json({ error: 'El recurso no tiene archivo en almacenamiento' });
});

// Ruta alternativa para descarga (por si proxies/alias fallan con el path anterior)
app.get('/library/download/:id', async (req, res) => {
  const { id } = req.params;
  const { data: item, error } = await supabase.from('library_items').select('*').eq('id', id).single();
  if (error) return res.status(500).json({ error: error.message });
  if (!item) return res.status(404).json({ error: `Recurso no encontrado (id ${id})` });

  if (item.file_storage_path) {
    const { url, error: signedError } = await signLibraryUrl(item.file_storage_path);
    if (signedError || !url) {
      return res
        .status(500)
        .json({ error: signedError?.message || 'No se pudo generar URL firmada', detail: signedError || null });
    }
    return res.json({ url });
  }

  if (item.file_download_url) {
    return res.json({ url: item.file_download_url });
  }

  return res.status(400).json({ error: 'El recurso no tiene archivo en almacenamiento' });
});

app.post('/library/items', async (req, res) => {
  const { title, author, category, description, copies, file, file_download_url, external_url } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Falta título' });

  let storagePath = null;
  let downloadUrl = file_download_url || external_url || null;

  if (file?.dataUrl && file?.name) {
    const decoded = dataUrlToBuffer(file.dataUrl);
    if (!decoded) return res.status(400).json({ error: 'Archivo inválido' });
    const path = `items/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(LIB_BUCKET)
      .upload(path, decoded.buffer, { contentType: decoded.contentType || file.type || 'application/octet-stream' });
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    storagePath = path;
    // No guardamos el signed URL (expira); se genera fresco al responder
    downloadUrl = null;
  }

  const { data, error } = await supabase
    .from('library_items')
    .insert({
      title,
      author,
      category,
      description,
      copies: copies ?? 1,
      file_storage_path: storagePath,
      file_download_url: downloadUrl,
    })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Devolvemos un signed URL fresco si hay archivo en storage
  if (storagePath) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(LIB_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (!signedError) {
      return res.json({ ...data, file_download_url: signed?.signedUrl || null });
    }
    console.error('No se pudo generar URL firmada de biblioteca:', signedError.message);
  }

  return res.json(data);
});

// Biblioteca: solicitudes de préstamo/descarga
app.get('/library/requests', async (req, res) => {
  const { status, userId } = req.query;
  let query = supabase.from('library_requests').select('*').order('requested_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Adjuntar título/categoría del item para mostrar en UI
  const itemsMap = new Map();
  const usersMap = new Map();
  if (data?.length) {
    const itemIds = Array.from(new Set(data.map((r) => r.item_id).filter(Boolean)));
    const userIds = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean)));
    if (itemIds.length) {
      const { data: items } = await supabase
        .from('library_items')
        .select('id,title,category,file_download_url,file_storage_path')
        .in('id', itemIds);
      items?.forEach((it) => itemsMap.set(it.id, it));
    }
    if (userIds.length) {
      const { data: users } = await supabase.from('users').select('id,name,email').in('id', userIds);
      users?.forEach((u) => usersMap.set(u.id, u));
    }
  }

  const enriched =
    data?.map((r) => {
      const item = itemsMap.get(r.item_id);
      const user = usersMap.get(r.user_id);
      return {
        ...r,
        user_name: r.user_name || user?.name || null,
        document_title: r.document_title || item?.title || 'Documento',
        document_category: item?.category || null,
        document_url: item?.file_download_url || null,
        document_storage_path: item?.file_storage_path || null,
      };
    }) || [];

  return res.json(enriched);
});

app.post('/library/requests', async (req, res) => {
  const { userId, itemId, userName, userEmail, dueDate } = req.body || {};
  if (!userId || !itemId) return res.status(400).json({ error: 'Faltan userId o itemId' });
  // Si no envían userName, intentamos obtenerlo de la tabla users (solo para la respuesta; la tabla no tiene user_name)
  let requesterName = userName || null;
  if (!requesterName) {
    const { data: userRow } = await supabase.from('users').select('name').eq('id', userId).maybeSingle();
    requesterName = userRow?.name || 'Usuario';
  }
  // Asegurar que el usuario existe en la tabla para cumplir la FK
  const fallbackEmail = userEmail || `user_${userId}@local.iuca`;
  await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        name: requesterName || 'Usuario',
        email: fallbackEmail,
        role: 'estudiante',
      },
      { onConflict: 'id' },
    )
    .select('id')
    .maybeSingle();
  let documentTitle = 'Documento';
  let documentUrl = null;
  const { data: itemRow } = await supabase.from('library_items').select('title,file_download_url').eq('id', itemId).single();
  if (itemRow?.title) documentTitle = itemRow.title;
  if (itemRow?.file_download_url) documentUrl = itemRow.file_download_url;
  const { data, error } = await supabase
    .from('library_requests')
    .insert({
      user_id: userId,
      item_id: itemId,
      due_date: dueDate || null,
      status: 'pendiente',
    })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    ...data,
    user_name: requesterName,
    document_title: documentTitle,
    document_url: documentUrl,
  });
});

app.patch('/library/requests/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, remark } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Falta status' });

  const payload = { status, remark: remark || null };
  if (status === 'devuelto') {
    payload.returned_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('library_requests')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// Tareas publicadas por curso/módulo
app.get('/assignments', async (req, res) => {
  const { courseId } = req.query;
  let query = supabase.from('assignments').select('*').order('created_at', { ascending: false });
  if (courseId) query = query.eq('course_id', String(courseId));
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/assignments', async (req, res) => {
  const { courseId, title, dueDate, description, teacherId } = req.body || {};
  if (!courseId || !title) return res.status(400).json({ error: 'Faltan courseId/title' });
  const payload = {
    course_id: courseId,
    title: title.trim(),
    due_date: dueDate || null,
    description: description || null,
    teacher_id: teacherId || null,
  };
  const { data, error } = await supabase.from('assignments').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.delete('/assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// Entregas de tareas
app.get('/submissions', async (req, res) => {
  const { assignmentId, userId, title } = req.query;
  let query = supabase.from('task_submissions').select('*').order('submitted_at', { ascending: false });
  if (assignmentId) query = query.eq('assignment_id', String(assignmentId));
  if (userId) query = query.eq('user_id', String(userId));
  if (title) query = query.ilike('title', `%${title}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/submissions', async (req, res) => {
  const { userId, title, fileName, fileUrl, fileMime, assignmentId, assignmentTitle, assignmentDue } = req.body || {};
  if (!userId || !title) return res.status(400).json({ error: 'Faltan userId/title' });
  const payload = {
    user_id: userId,
    title: title.trim(),
    file_name: fileName || null,
    file_url: fileUrl || null,
    file_mime: fileMime || null,
    assignment_id: assignmentId || null,
    assignment_title: assignmentTitle || null,
    assignment_due: assignmentDue || null,
    status: 'enviado',
  };
  const { data, error } = await supabase.from('task_submissions').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.patch('/submissions/:id/grade', async (req, res) => {
  const { id } = req.params;
  const { grade } = req.body || {};
  if (grade === undefined) return res.status(400).json({ error: 'Falta grade' });
  const { data, error } = await supabase
    .from('task_submissions')
    .update({ grade, status: 'calificado' })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// Auditoría (eventos administrativos)
app.get('/audit', async (_req, res) => {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/audit', async (req, res) => {
  const { action, detail } = req.body || {};
  if (!action || !detail) return res.status(400).json({ error: 'Faltan action/detail' });
  const payload = {
    id: crypto.randomUUID(),
    action: String(action),
    detail: String(detail),
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('audit_logs').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.listen(PORT, () => {
  console.log(`API de inscripciones escuchando en puerto ${PORT}`);
});
