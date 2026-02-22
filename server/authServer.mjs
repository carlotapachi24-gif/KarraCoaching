import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const dataDir = path.join(__dirname, 'data');
const dataPath = path.join(dataDir, 'store.json');

const PORT = Number(process.env.PORT || 8787);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const MAX_JSON_BODY_BYTES = Number(process.env.MAX_JSON_BODY_BYTES || 8_000_000);
const COACH_EMAIL = 'carlotaloopezcarracedo@gmail.com';
const COACH_PASSWORD = '123456';
const CLIENT_CREDENTIALS = process.env.CLIENT_CREDENTIALS || '';
const ALLOW_OPEN_CLIENT_LOGIN = (process.env.ALLOW_OPEN_CLIENT_LOGIN || 'true').toLowerCase() === 'true';
const progressPhotoViews = new Set(['frente', 'perfil', 'espalda']);

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const sessions = new Map();
let persistQueue = Promise.resolve();
let store = null;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const librarySeedCatalog = [
  { title: 'Press banca plano', category: 'Empuje', muscle: 'Pecho', description: 'Escapulas retraidas, pies firmes y barra al pecho medio con recorrido controlado.' },
  { title: 'Press banca inclinado', category: 'Empuje', muscle: 'Pecho superior', description: 'Banco entre 30 y 45 grados, hombros abajo y codos estables durante todo el gesto.' },
  { title: 'Flexiones', category: 'Empuje', muscle: 'Pecho', description: 'Cuerpo en bloque, abdomen activo y pecho cerca del suelo sin colapsar lumbares.' },
  { title: 'Fondos en paralelas', category: 'Empuje', muscle: 'Pecho', description: 'Ligera inclinacion del torso, hombros estables y bajada solo hasta rango sin dolor.' },
  { title: 'Aperturas con mancuernas', category: 'Empuje', muscle: 'Pecho', description: 'Codos semiflexionados, arco amplio y controlando la fase negativa sin rebotes.' },
  { title: 'Cruce de poleas', category: 'Empuje', muscle: 'Pecho', description: 'Pecho alto, escpulas estables y cruce al frente con control constante de tension.' },
  { title: 'Pullover con mancuerna', category: 'Empuje', muscle: 'Pecho', description: 'Mantener costillas controladas, codos suaves y recorrido limpio desde hombros.' },

  { title: 'Dominadas pronas', category: 'Tiron', muscle: 'Dorsal', description: 'Iniciar desde escapulas, subir pecho a la barra y evitar balanceos.' },
  { title: 'Dominadas supinas', category: 'Tiron', muscle: 'Dorsal y biceps', description: 'Agarre supino al ancho de hombros y subida estable sin impulso de piernas.' },
  { title: 'Dominadas neutras', category: 'Tiron', muscle: 'Dorsal', description: 'Agarre neutro, tronco firme y descenso completo con control en cada repeticion.' },
  { title: 'Jalon al pecho', category: 'Tiron', muscle: 'Dorsal', description: 'Bajar al pecho alto, codos hacia abajo y sin tirar de la zona lumbar.' },
  { title: 'Remo', category: 'Tiron', muscle: 'Espalda media', description: 'Espalda neutra, tiron hacia cadera y escpulas juntas al final del recorrido.' },
  { title: 'Peso muerto', category: 'Cadena posterior', muscle: 'Espalda y gluteo', description: 'Barra pegada al cuerpo, bisagra de cadera y tronco firme desde el inicio.' },
  { title: 'Peso muerto sumo', category: 'Cadena posterior', muscle: 'Gluteo y aductores', description: 'Pies abiertos, rodillas alineadas con puntas y pecho alto durante el levantamiento.' },
  { title: 'Peso muerto rumano', category: 'Cadena posterior', muscle: 'Isquios y gluteo', description: 'Cadera atras, rodillas suaves y barra cercana al muslo sin perder neutralidad.' },
  { title: 'Hip thrust', category: 'Cadena posterior', muscle: 'Gluteo', description: 'Menton recogido, pelvis neutra y extension completa de cadera sin hiperextender espalda.' },

  { title: 'Sentadilla', category: 'Pierna', muscle: 'Cuadriceps', description: 'Pies firmes, rodillas siguiendo puntas y profundidad segun movilidad sin perder tecnica.' },
  { title: 'Prensa horizontal', category: 'Pierna', muscle: 'Cuadriceps', description: 'Lumbar pegada al respaldo, bajada controlada y empuje completo sin bloquear rodillas.' },
  { title: 'V-Squat', category: 'Pierna', muscle: 'Cuadriceps', description: 'Torso estable, recorrido consistente y peso distribuido en toda la planta del pie.' },
  { title: 'Hack squat', category: 'Pierna', muscle: 'Cuadriceps', description: 'Bajada profunda controlada, rodillas alineadas y subida continua sin rebote.' },
  { title: 'Zancadas caminando', category: 'Pierna', muscle: 'Cuadriceps y gluteo', description: 'Paso largo estable, tronco recto y control de la rodilla delantera.' },
  { title: 'Bulgaras', category: 'Pierna', muscle: 'Cuadriceps y gluteo', description: 'Pie trasero apoyado, cadera cuadrada y descenso vertical sin perder equilibrio.' },
  { title: 'Extension de cuadriceps', category: 'Pierna', muscle: 'Cuadriceps', description: 'Controlar subida y bajada, evitar impulso y mantener alineacion de rodilla.' },
  { title: 'Curl femoral', category: 'Pierna', muscle: 'Isquios', description: 'Cadera estable, talones hacia gluteos y descenso lento para mantener tension.' },
  { title: 'Puente de gluteo', category: 'Pierna', muscle: 'Gluteo', description: 'Empuje desde talones, abdomen activo y pausa arriba sin arquear la espalda.' },
  { title: 'Elevacion de talones', category: 'Pierna', muscle: 'Gemelos', description: 'Subida completa en puntas, pausa corta arriba y bajada lenta y controlada.' },

  { title: 'Press militar', category: 'Empuje', muscle: 'Hombro', description: 'Gluteos y abdomen activos, barra en linea recta y bloqueo estable sobre cabeza.' },
  { title: 'Push press', category: 'Empuje', muscle: 'Hombro', description: 'Pequena flexion de rodillas, transferir fuerza y finalizar con control overhead.' },
  { title: 'Elevaciones laterales', category: 'Empuje', muscle: 'Deltoide lateral', description: 'Brazos semiflexionados, elevar hasta linea de hombro sin balancear tronco.' },
  { title: 'Pajaros con mancuerna', category: 'Tiron', muscle: 'Deltoide posterior', description: 'Cadera en bisagra, cuello neutro y apertura lateral sin impulso.' },
  { title: 'Face pull', category: 'Tiron', muscle: 'Deltoide posterior', description: 'Tirar hacia la cara, codos altos y escpulas activas en cada repeticion.' },

  { title: 'Curl con barra', category: 'Tiron', muscle: 'Biceps', description: 'Codos pegados al torso, subida limpia y bajar sin perder tension.' },
  { title: 'Curl martillo', category: 'Tiron', muscle: 'Biceps y braquial', description: 'Agarre neutro, munecas firmes y codos estables durante todo el rango.' },
  { title: 'Curl concentrado', category: 'Tiron', muscle: 'Biceps', description: 'Brazo apoyado, recorrido completo y foco en contraccion al final.' },
  { title: 'Fondos', category: 'Empuje', muscle: 'Triceps', description: 'Torso mas vertical, codos atras y rango seguro segun movilidad de hombro.' },
  { title: 'Extension en polea', category: 'Empuje', muscle: 'Triceps', description: 'Codos fijos al costado, extension completa y retorno controlado.' },
  { title: 'Extension por encima de la cabeza', category: 'Empuje', muscle: 'Triceps', description: 'Brazos cerca de orejas, abdomen activo y recorrido completo sin arquear lumbar.' },
  { title: 'Press frances', category: 'Empuje', muscle: 'Triceps', description: 'Bajar controlado hacia frente, codos estables y subir sin abrirlos en exceso.' },

  { title: 'Plancha frontal', category: 'Core', muscle: 'Core', description: 'Linea recta cabeza-cadera-talones, abdomen firme y respiracion controlada.' },
  { title: 'Dead bug', category: 'Core', muscle: 'Core', description: 'Zona lumbar estable, mover brazos y piernas alternos sin perder control.' },
  { title: 'Ab wheel', category: 'Core', muscle: 'Core', description: 'Iniciar corto, gluteos activos y evitar hundir la zona lumbar.' },
  { title: 'Pallof press', category: 'Core', muscle: 'Oblicuos', description: 'Resistir rotacion, brazos extendidos y pelvis estable durante la ejecucion.' },
  { title: 'Plancha lateral', category: 'Core', muscle: 'Oblicuos', description: 'Cuerpo alineado, cadera alta y apoyo firme en antebrazo y pies.' },
  { title: 'Crunch', category: 'Core', muscle: 'Recto abdominal', description: 'Elevar torax con control, sin tirar del cuello y exhalando al subir.' },
  { title: 'Elevaciones de piernas', category: 'Core', muscle: 'Abdominal inferior', description: 'Lumbar pegada, subir piernas sin impulso y bajar lentamente.' },
  { title: 'Toes to bar', category: 'Core', muscle: 'Core', description: 'Iniciar con balance minimo, elevar piernas activando abdomen y controlar bajada.' },
];

function buildSeedLibraryResources() {
  const createdAt = new Date().toISOString();
  return librarySeedCatalog.map((item) => ({
    id: randomUUID(),
    title: item.title,
    category: item.category,
    muscle: item.muscle,
    description: item.description,
    videoUrl: defaultVideoUrlForResource(item.title),
    createdAt,
    createdBy: COACH_EMAIL,
  }));
}

function normalizeResourceKey(title) {
  return String(title || '').trim().toLowerCase();
}

const defaultResourceVideoUrlByKey = new Map([
  [normalizeResourceKey('Press banca plano'), '/press%20banca.gif'],
]);

function defaultVideoUrlForResource(title) {
  return defaultResourceVideoUrlByKey.get(normalizeResourceKey(title)) || '';
}

function mergeLibrarySeedResources(existingResources) {
  const safeResources = Array.isArray(existingResources) ? [...existingResources] : [];
  const existingKeys = new Set();

  safeResources.forEach((resource) => {
    const key = normalizeResourceKey(resource?.title);
    if (!key) return;
    existingKeys.add(key);

    if (!String(resource?.videoUrl || '').trim()) {
      const fallbackVideoUrl = defaultVideoUrlForResource(resource?.title);
      if (fallbackVideoUrl) {
        resource.videoUrl = fallbackVideoUrl;
      }
    }
  });

  for (const seed of librarySeedCatalog) {
    const key = normalizeResourceKey(seed.title);
    if (!key || existingKeys.has(key)) {
      continue;
    }

    safeResources.push({
      id: randomUUID(),
      title: seed.title,
      category: seed.category,
      muscle: seed.muscle,
      description: seed.description,
      videoUrl: defaultVideoUrlForResource(seed.title),
      createdAt: nowIso(),
      createdBy: COACH_EMAIL,
    });
    existingKeys.add(key);
  }

  return safeResources;
}

function parseClientCredentials(rawValue) {
  return rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((credentials, entry) => {
      const [emailPart, ...passwordParts] = entry.split(':');
      const email = (emailPart || '').trim().toLowerCase();
      const password = passwordParts.join(':').trim();

      if (!email || !password) {
        return credentials;
      }

      credentials.set(email, password);
      return credentials;
    }, new Map());
}

const envClientCredentials = parseClientCredentials(CLIENT_CREDENTIALS);

function displayNameFromEmail(email) {
  const localPart = (email.split('@')[0] || '').trim();
  if (!localPart) return 'Cliente';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildDefaultProfile(email, name) {
  const normalizedEmail = email.toLowerCase();
  const fallbackName = name || displayNameFromEmail(normalizedEmail);
  const [firstName = fallbackName, ...lastNameParts] = fallbackName.split(' ').filter(Boolean);
  const lastName = lastNameParts.join(' ');

  return {
    firstName,
    lastName,
    email: normalizedEmail,
    phone: '+34 600 000 000',
    birthDate: '1995-05-20',
    heightCm: 182,
    startWeightKg: 90.2,
    currentWeightKg: 83.5,
    bio: 'Objetivo activo en curso.',
    injuries: [],
    avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(normalizedEmail)}/150`,
  };
}

const weekDayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const defaultExercisePool = [
  'Sentadilla Barra Trasera',
  'Press Banca Plano',
  'Peso Muerto Rumano',
  'Remo con Barra',
  'Press Militar',
  'Dominadas',
  'Hip Thrust',
  'Prensa Inclinada',
  'Curl Femoral',
  'Plancha Frontal',
];

function toDateKey(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePlanDate(value, fallbackDate = '') {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return fallbackDate;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValid) {
    return fallbackDate;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getStartOfWeekLocal(baseDate = new Date()) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDateKeys(length = 7, baseDate = new Date()) {
  const safeLength = Math.max(1, Number(length) || 1);
  const weekStart = getStartOfWeekLocal(baseDate);
  return Array.from({ length: safeLength }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return toDateKey(date);
  });
}

function getDayLabelFromDateKey(dateKey) {
  const normalized = normalizePlanDate(dateKey);
  if (!normalized) {
    return 'Dia';
  }

  const [year, month, day] = normalized.split('-').map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  return weekDayLabels[date.getDay()] || 'Dia';
}

function hashString(value) {
  return String(value || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function buildDefaultWorkoutExercises(title, exercisesCount) {
  const totalExercises = Math.max(0, Number(exercisesCount) || 0);
  const normalizedTitle = String(title || '').toLowerCase();
  if (
    totalExercises === 0 ||
    normalizedTitle.includes('descanso')
  ) {
    return [];
  }

  const count = Math.min(Math.max(totalExercises, 1), 12);
  const offset = Math.abs(hashString(title)) % defaultExercisePool.length;

  return Array.from({ length: count }, (_, index) => ({
    id: randomUUID(),
    resourceId: '',
    name: defaultExercisePool[(offset + index) % defaultExercisePool.length],
    sets: index < 2 ? '4' : '3',
    reps: index < 2 ? '6-10' : '10-15',
    rir: '2',
    weight: '',
  }));
}

function sanitizeWorkoutExercises(rawList, title, exercisesCount) {
  const source = Array.isArray(rawList) ? rawList : [];
  const sanitized = source
    .map((item) => {
      const name = String(item?.name || item?.title || '').trim();
      if (!name) {
        return null;
      }

      return {
        id: String(item.id || randomUUID()),
        resourceId: String(item.resourceId || '').trim(),
        name,
        sets: String(item.sets || item.series || '3').trim(),
        reps: String(item.reps || item.repetitions || '8-12').trim(),
        rir: String(item.rir || '2').trim(),
        weight: String(item.weight || item.peso || item.load || '').trim(),
      };
    })
    .filter(Boolean);

  if (sanitized.length > 0) {
    return sanitized;
  }

  return buildDefaultWorkoutExercises(title, exercisesCount);
}

function sanitizeWeeklySchedule(rawWeekly) {
  const source = Array.isArray(rawWeekly) ? rawWeekly : [];
  const fallbackDates = getWeekDateKeys(Math.max(source.length, 7));

  return source
    .map((item, index) => {
      const title = String(item.title || '').trim();
      const fallbackDate = fallbackDates[index] || fallbackDates[0];
      const scheduledDate = normalizePlanDate(item.scheduledDate || item.date, fallbackDate);
      const fallbackDay = getDayLabelFromDateKey(scheduledDate) || `Dia ${index + 1}`;
      const day = String(item.day || fallbackDay).trim() || fallbackDay;
      const exercisesCount = Math.max(0, Number(item.exercises || 0));
      const workoutExercises = sanitizeWorkoutExercises(item.workoutExercises, title, exercisesCount);
      const finalExercises = exercisesCount > 0 ? exercisesCount : workoutExercises.length;

      return {
        id: String(item.id || randomUUID()),
        day,
        title,
        duration: String(item.duration || '').trim() || '60 min',
        exercises: finalExercises,
        status: ['completed', 'today', 'upcoming'].includes(String(item.status || ''))
          ? String(item.status)
          : index === 0
            ? 'completed'
            : index === 1
              ? 'today'
              : 'upcoming',
        description: String(item.description || '').trim(),
        scheduledDate,
        workoutExercises,
      };
    })
    .filter((item) => item.day && item.title);
}

function buildWeeklySchedule(spec) {
  return sanitizeWeeklySchedule(spec);
}

function buildDefaultMonthlyPlan(templateKey, monthlyGoal) {
  const baseFocus = {
    fuerza: ['Base tecnica', 'Intensificacion', 'Sobrecarga controlada', 'Descarga activa'],
    perdida: ['Deficit inicial', 'Densidad de entrenamiento', 'Consolidacion', 'Ajuste y descarga'],
    cinco_x_cinco: ['Ajuste de cargas', 'Progresion lineal', 'Consolidacion tecnica', 'Deload'],
    recomposicion: ['Base de volumen', 'Incremento de intensidad', 'Densidad metabolica', 'Descarga'],
    mantenimiento: ['Mantenimiento de fuerza', 'Capacidad aerobica', 'Movilidad y control', 'Semana ligera'],
    hipertrofia: ['Acumulacion de volumen', 'Intensificacion progresiva', 'Sobrecarga selectiva', 'Descarga'],
  };

  const phases = baseFocus[templateKey] || baseFocus.hipertrofia;
  return phases.map((focus, index) => ({
    id: randomUUID(),
    weekLabel: `Semana ${index + 1}`,
    focus,
    objective: monthlyGoal,
    status: index === 1 ? 'current' : index === 0 ? 'completed' : 'upcoming',
  }));
}

function buildSingleClientExamplePlan() {
  const monthlyGoal = 'Plan Ejemplo - 4 semanas (cliente activo)';
  return {
    monthlyGoal,
    weeklySchedule: buildWeeklySchedule([
      {
        day: 'Lunes',
        title: 'Pierna + Core (Fuerza tecnica)',
        duration: '70 min',
        exercises: 6,
        description: 'Sentadilla, bisagra de cadera y bloque final de core anti-rotacion.',
      },
      {
        day: 'Martes',
        title: 'Empuje torso (Hipertrofia)',
        duration: '65 min',
        exercises: 6,
        description: 'Press banca, press inclinado y accesorios de hombro-triceps.',
      },
      {
        day: 'Miercoles',
        title: 'Cardio Z2 + Movilidad',
        duration: '40 min',
        exercises: 2,
        description: 'Cardio continuo suave y rutina de movilidad global.',
      },
      {
        day: 'Jueves',
        title: 'Traccion + Gluteo',
        duration: '70 min',
        exercises: 6,
        description: 'Dominadas/remos y bloque accesorio de gluteo-femoral.',
      },
      {
        day: 'Viernes',
        title: 'Full Body metabolico',
        duration: '55 min',
        exercises: 8,
        description: 'Circuitos por estaciones con enfasis en densidad de trabajo.',
      },
      {
        day: 'Sabado',
        title: 'Actividad libre guiada',
        duration: '35 min',
        exercises: 2,
        description: 'Pasos, movilidad y respiracion para recuperacion activa.',
      },
      {
        day: 'Domingo',
        title: 'Descanso total',
        duration: '-',
        exercises: 0,
        description: 'Recuperacion completa y preparacion de la siguiente semana.',
      },
    ]),
    monthlyPlan: [
      { id: randomUUID(), weekLabel: 'Semana 1', focus: 'Base tecnica', objective: monthlyGoal, status: 'completed' },
      { id: randomUUID(), weekLabel: 'Semana 2', focus: 'Progresion de cargas', objective: monthlyGoal, status: 'current' },
      { id: randomUUID(), weekLabel: 'Semana 3', focus: 'Densidad y calidad', objective: monthlyGoal, status: 'upcoming' },
      { id: randomUUID(), weekLabel: 'Semana 4', focus: 'Ajuste y descarga', objective: monthlyGoal, status: 'upcoming' },
    ],
    source: 'AUTO_TEMPLATE',
    updatedAt: new Date().toISOString(),
    updatedBy: COACH_EMAIL,
  };
}

function inferPlanTemplateKey(email, name) {
  const fingerprint = `${normalizeEmail(email)} ${(name || '').toLowerCase()}`;

  if (fingerprint.includes('alex')) return 'fuerza';
  if (fingerprint.includes('maria')) return 'perdida';
  if (fingerprint.includes('juan')) return 'cinco_x_cinco';
  if (fingerprint.includes('laura')) return 'recomposicion';
  if (fingerprint.includes('carlos')) return 'hipertrofia';
  if (fingerprint.includes('ana')) return 'mantenimiento';

  const templates = ['hipertrofia', 'fuerza', 'recomposicion', 'perdida'];
  let hash = 0;
  for (const char of normalizeEmail(email)) {
    hash += char.charCodeAt(0);
  }
  return templates[hash % templates.length];
}

function buildDefaultPlan(email = '', name = '') {
  const templateKey = inferPlanTemplateKey(email, name);
  let monthlyGoal = 'Hipertrofia - Bloque de acumulacion';
  let weeklySchedule = [];
  let monthlyPlan = [];

  if (templateKey === 'fuerza') {
    monthlyGoal = 'Fuerza - Bloque intensivo de 4 semanas';
    weeklySchedule = buildWeeklySchedule([
      { day: 'Lunes', title: 'Sentadilla + Accesorios', duration: '80 min', exercises: 5, description: 'Enfoque en sentadilla pesada y estabilidad de tronco.' },
      { day: 'Martes', title: 'Press Banca + Triceps', duration: '70 min', exercises: 5, description: 'Top set en banca y volumen de apoyo para empuje.' },
      { day: 'Miercoles', title: 'Recuperacion Activa', duration: '30 min', exercises: 2, description: 'Movilidad, caminata y descarga de fatiga.' },
      { day: 'Jueves', title: 'Peso Muerto + Espalda', duration: '75 min', exercises: 5, description: 'Trabajo principal en bisagra y fuerza de traccion.' },
      { day: 'Viernes', title: 'Full Body Explosivo', duration: '60 min', exercises: 6, description: 'Potencia y velocidad de barra con volumen moderado.' },
      { day: 'Sabado', title: 'Cardio Z2', duration: '40 min', exercises: 1, description: 'Recuperacion aerobica en zona dos.' },
      { day: 'Domingo', title: 'Descanso Total', duration: '-', exercises: 0, description: 'Recuperacion completa.' },
    ]);
  } else if (templateKey === 'perdida') {
    monthlyGoal = 'Perdida de grasa - Definicion progresiva';
    weeklySchedule = buildWeeklySchedule([
      { day: 'Lunes', title: 'Pierna + Core', duration: '65 min', exercises: 6, description: 'Trabajo metabolico de tren inferior y zona media.' },
      { day: 'Martes', title: 'Empuje + HIIT corto', duration: '60 min', exercises: 6, description: 'Empuje de torso y bloque final de alta intensidad.' },
      { day: 'Miercoles', title: 'Cardio LISS', duration: '45 min', exercises: 1, description: 'Cardio suave para aumentar gasto sin fatiga alta.' },
      { day: 'Jueves', title: 'Traccion + Gluteo', duration: '65 min', exercises: 6, description: 'Dorsal, femoral y gluteo con enfoque tecnico.' },
      { day: 'Viernes', title: 'Circuito Full Body', duration: '50 min', exercises: 8, description: 'Circuito por bloques para elevar densidad de trabajo.' },
      { day: 'Sabado', title: 'Pasos + Movilidad', duration: '35 min', exercises: 2, description: 'Trabajo de actividad diaria y movilidad general.' },
      { day: 'Domingo', title: 'Descanso Total', duration: '-', exercises: 0, description: 'Recuperacion completa.' },
    ]);
  } else if (templateKey === 'cinco_x_cinco') {
    monthlyGoal = 'Fuerza base - Metodo 5x5';
    weeklySchedule = buildWeeklySchedule([
      { day: 'Lunes', title: '5x5 Dia A', duration: '70 min', exercises: 4, description: 'Sentadilla, banca y remos en esquema 5x5.' },
      { day: 'Martes', title: 'Cardio suave', duration: '30 min', exercises: 1, description: 'Actividad suave y estiramientos.' },
      { day: 'Miercoles', title: '5x5 Dia B', duration: '70 min', exercises: 4, description: 'Sentadilla, press militar y peso muerto.' },
      { day: 'Jueves', title: 'Movilidad + Core', duration: '30 min', exercises: 3, description: 'Estabilidad lumbo-pelvica y rango articular.' },
      { day: 'Viernes', title: '5x5 Dia A', duration: '70 min', exercises: 4, description: 'Segunda exposicion semanal al dia A.' },
      { day: 'Sabado', title: 'Paseo activo', duration: '30 min', exercises: 1, description: 'Recuperacion activa y pasos diarios.' },
      { day: 'Domingo', title: 'Descanso Total', duration: '-', exercises: 0, description: 'Recuperacion completa.' },
    ]);
  } else if (templateKey === 'recomposicion') {
    monthlyGoal = 'Recomposicion corporal - Fuerza + condicion';
    weeklySchedule = buildWeeklySchedule([
      { day: 'Lunes', title: 'Pierna Fuerza', duration: '70 min', exercises: 5, description: 'Trabajo principal de fuerza en tren inferior.' },
      { day: 'Martes', title: 'Torso Hipertrofia', duration: '65 min', exercises: 6, description: 'Volumen de torso y control tecnico.' },
      { day: 'Miercoles', title: 'Cardio intervalico', duration: '35 min', exercises: 2, description: 'Bloques cortos de intensidad media-alta.' },
      { day: 'Jueves', title: 'Pierna Metabolica', duration: '60 min', exercises: 6, description: 'Trabajo de densidad y tolerancia al esfuerzo.' },
      { day: 'Viernes', title: 'Torso Fuerza', duration: '65 min', exercises: 5, description: 'Empuje-traccion pesado con descansos largos.' },
      { day: 'Sabado', title: 'LISS + movilidad', duration: '40 min', exercises: 2, description: 'Recuperacion activa y mantenimiento de rango.' },
      { day: 'Domingo', title: 'Descanso Total', duration: '-', exercises: 0, description: 'Recuperacion completa.' },
    ]);
  } else if (templateKey === 'mantenimiento') {
    monthlyGoal = 'Mantenimiento activo - Salud y rendimiento';
    weeklySchedule = buildWeeklySchedule([
      { day: 'Lunes', title: 'Full Body A', duration: '55 min', exercises: 5, description: 'Sesion general de fuerza con volumen moderado.' },
      { day: 'Martes', title: 'Cardio moderado', duration: '35 min', exercises: 1, description: 'Trabajo aerobico continuo moderado.' },
      { day: 'Miercoles', title: 'Full Body B', duration: '55 min', exercises: 5, description: 'Sesion complementaria de fuerza y movilidad.' },
      { day: 'Jueves', title: 'Movilidad + Core', duration: '30 min', exercises: 3, description: 'Mantenimiento articular y estabilidad central.' },
      { day: 'Viernes', title: 'Sesion libre guiada', duration: '50 min', exercises: 4, description: 'Bloque de ejercicios segun sensaciones de la semana.' },
      { day: 'Sabado', title: 'Actividad recreativa', duration: '40 min', exercises: 1, description: 'Actividad ligera al aire libre o similar.' },
      { day: 'Domingo', title: 'Descanso Total', duration: '-', exercises: 0, description: 'Recuperacion completa.' },
    ]);
  } else {
    monthlyGoal = 'Hipertrofia - Bloque de acumulacion';
    weeklySchedule = buildWeeklySchedule([
      { day: 'Lunes', title: 'Pierna Hipertrofia', duration: '75 min', exercises: 6, description: 'Enfoque en cuadriceps y gemelo. Mantener RIR 2 en sentadilla.' },
      { day: 'Martes', title: 'Empuje Fuerza', duration: '60 min', exercises: 5, description: 'Trabajo pesado de banca y militar. Descansos largos (3-5 min).' },
      { day: 'Miercoles', title: 'Descanso Activo', duration: '30 min', exercises: 1, description: 'Caminata ligera o movilidad.' },
      { day: 'Jueves', title: 'Traccion Hipertrofia', duration: '70 min', exercises: 6, description: 'Foco en dorsal ancho y biceps.' },
      { day: 'Viernes', title: 'Full Body Metabolico', duration: '50 min', exercises: 8, description: 'Circuito de alta intensidad.' },
      { day: 'Sabado', title: 'Cardio LISS', duration: '45 min', exercises: 1, description: 'Bicicleta estatica a ritmo conversacional.' },
      { day: 'Domingo', title: 'Descanso Total', duration: '-', exercises: 0, description: 'Recuperacion completa.' },
    ]);
  }

  monthlyPlan = buildDefaultMonthlyPlan(templateKey, monthlyGoal);

  return {
    monthlyGoal,
    weeklySchedule,
    monthlyPlan,
    source: 'AUTO_TEMPLATE',
    updatedAt: new Date().toISOString(),
    updatedBy: COACH_EMAIL,
  };
}

function isLegacyGenericPlan(plan) {
  if (!plan || !Array.isArray(plan.weeklySchedule) || plan.weeklySchedule.length === 0) {
    return true;
  }
  if (plan.source === 'CUSTOM') {
    return false;
  }
  if (plan.weeklySchedule.length < 2) {
    return false;
  }
  const first = plan.weeklySchedule[0]?.title || '';
  const second = plan.weeklySchedule[1]?.title || '';
  return (
    plan.monthlyGoal === 'Hipertrofia - Bloque de acumulacion' &&
    first === 'Pierna Hipertrofia' &&
    second === 'Empuje Fuerza'
  );
}

function buildDefaultStore() {
  return {
    users: [
      {
        email: COACH_EMAIL,
        password: COACH_PASSWORD,
        role: 'COACH',
        name: 'Carlota',
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ],
    profiles: {},
    plans: {},
    resources: buildSeedLibraryResources(),
    messages: [],
    reviews: [],
    notifications: [],
    progressPhotos: {},
    workoutLogs: [],
  };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function isIsoDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function getConversationKey(emailA, emailB) {
  return [normalizeEmail(emailA), normalizeEmail(emailB)].sort().join('|');
}

function getStartOfIsoWeek(date) {
  const value = new Date(date);
  const day = value.getUTCDay() || 7;
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value;
}

function getIsoWeekKey(dateInput) {
  const date = new Date(dateInput);
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function normalizeStoredPlan(plan, fallbackEmail = '', fallbackName = '') {
  const fallbackPlan = buildDefaultPlan(fallbackEmail, fallbackName);
  if (!plan || typeof plan !== 'object') {
    return fallbackPlan;
  }

  const monthlyGoal = String(plan.monthlyGoal || fallbackPlan.monthlyGoal || '').trim() || fallbackPlan.monthlyGoal;
  const weeklySchedule = sanitizeWeeklySchedule(plan.weeklySchedule);
  const monthlyPlan = sanitizeMonthlyPlan(plan.monthlyPlan, monthlyGoal);

  return {
    ...fallbackPlan,
    ...plan,
    monthlyGoal,
    weeklySchedule: weeklySchedule.length > 0 ? weeklySchedule : fallbackPlan.weeklySchedule,
    monthlyPlan: monthlyPlan.length > 0 ? monthlyPlan : fallbackPlan.monthlyPlan,
  };
}

function sanitizeProgressPhotoView(view) {
  const normalized = String(view || '').trim().toLowerCase();
  return progressPhotoViews.has(normalized) ? normalized : 'frente';
}

function sanitizeProgressPhotoRecord(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const imageData = String(item.imageData || '').trim();
  if (!imageData.startsWith('data:image/')) {
    return null;
  }

  const weightValue = Number(item.weightKg);
  const weightKg =
    Number.isFinite(weightValue) && weightValue > 0
      ? Math.round(weightValue * 10) / 10
      : null;

  return {
    id: String(item.id || randomUUID()),
    view: sanitizeProgressPhotoView(item.view),
    imageData,
    uploadedAt: isIsoDate(item.uploadedAt) ? new Date(item.uploadedAt).toISOString() : nowIso(),
    uploadedBy: normalizeEmail(item.uploadedBy || ''),
    weightKg,
  };
}

function sanitizeProgressPhotosCollection(collection) {
  const photos = Array.isArray(collection)
    ? collection
        .map((item) => sanitizeProgressPhotoRecord(item))
        .filter(Boolean)
    : [];

  photos.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
  return photos;
}

function ensureProgressPhotosStore() {
  if (!store.progressPhotos || typeof store.progressPhotos !== 'object') {
    store.progressPhotos = {};
  }
}

function getProgressPhotosForClient(email) {
  const normalizedEmail = normalizeEmail(email);
  ensureProgressPhotosStore();
  store.progressPhotos[normalizedEmail] = sanitizeProgressPhotosCollection(store.progressPhotos[normalizedEmail]);
  return store.progressPhotos[normalizedEmail];
}

function parseWorkoutWeightKg(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.replace(',', '.').replace(/[^0-9.\-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

function sanitizeWorkoutLogRecord(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const clientEmail = normalizeEmail(item.clientEmail);
  if (!clientEmail || clientEmail === COACH_EMAIL) {
    return null;
  }

  const completedAt = isIsoDate(item.completedAt) ? new Date(item.completedAt).toISOString() : nowIso();
  const scheduledDate = normalizePlanDate(item.scheduledDate || completedAt, toDateKey(new Date(completedAt)));
  const exercises = Array.isArray(item.exercises)
    ? item.exercises
        .map((exercise) => {
          const name = String(exercise?.name || '').trim();
          if (!name) return null;
          return {
            id: String(exercise?.id || randomUUID()),
            name,
            weight: String(exercise?.weight || '').trim(),
          };
        })
        .filter(Boolean)
    : [];

  return {
    id: String(item.id || randomUUID()),
    clientEmail,
    dayId: String(item.dayId || '').trim(),
    dayTitle: String(item.dayTitle || 'Sesion').trim() || 'Sesion',
    scheduledDate,
    completedAt,
    completedBy: normalizeEmail(item.completedBy || ''),
    exercises,
  };
}

function ensureWorkoutLogsStore() {
  if (!Array.isArray(store.workoutLogs)) {
    store.workoutLogs = [];
  }

  store.workoutLogs = store.workoutLogs
    .map((item) => sanitizeWorkoutLogRecord(item))
    .filter(Boolean)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
}

function getWorkoutLogsForClient(email) {
  const normalizedEmail = normalizeEmail(email);
  ensureWorkoutLogsStore();
  return store.workoutLogs.filter((log) => log.clientEmail === normalizedEmail);
}

function trackCompletedWorkoutLog(clientEmail, day, completedBy) {
  const normalizedEmail = normalizeEmail(clientEmail);
  if (!normalizedEmail || normalizedEmail === COACH_EMAIL || !day || typeof day !== 'object') {
    return;
  }

  ensureWorkoutLogsStore();
  const completedAt = nowIso();
  const scheduledDate = normalizePlanDate(day.scheduledDate || completedAt, toDateKey(new Date(completedAt)));
  const dayId = String(day.id || '').trim();
  const exercises = Array.isArray(day.workoutExercises)
    ? day.workoutExercises
        .map((exercise, index) => {
          const name = String(exercise?.name || '').trim();
          if (!name) return null;
          return {
            id: String(exercise?.id || `exercise-${index + 1}`),
            name,
            weight: String(exercise?.weight || exercise?.peso || '').trim(),
          };
        })
        .filter(Boolean)
    : [];

  const existingIndex = store.workoutLogs.findIndex(
    (log) =>
      log.clientEmail === normalizedEmail &&
      log.dayId === dayId &&
      log.scheduledDate === scheduledDate,
  );

  const nextRecord = {
    id: existingIndex >= 0 ? store.workoutLogs[existingIndex].id : randomUUID(),
    clientEmail: normalizedEmail,
    dayId,
    dayTitle: String(day.title || 'Sesion').trim() || 'Sesion',
    scheduledDate,
    completedAt,
    completedBy: normalizeEmail(completedBy || ''),
    exercises,
  };

  if (existingIndex >= 0) {
    store.workoutLogs[existingIndex] = nextRecord;
  } else {
    store.workoutLogs.push(nextRecord);
  }

  store.workoutLogs.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
}

function buildProgressMetricsForClient(email) {
  const normalizedEmail = normalizeEmail(email);
  const reviews = store.reviews
    .filter((review) => normalizeEmail(review.clientEmail) === normalizedEmail)
    .filter((review) => Number(review.weightKg) > 0 && isIsoDate(review.submittedAt))
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  const bodyWeightHistory = reviews.map((review) => ({
    recordedAt: new Date(review.submittedAt).toISOString(),
    weightKg: Math.round(Number(review.weightKg) * 10) / 10,
    source: 'checkin',
    reviewId: String(review.id || ''),
  }));

  if (bodyWeightHistory.length === 0) {
    const profileWeight = Number(store.profiles[normalizedEmail]?.currentWeightKg || 0);
    if (Number.isFinite(profileWeight) && profileWeight > 0) {
      bodyWeightHistory.push({
        recordedAt: nowIso(),
        weightKg: Math.round(profileWeight * 10) / 10,
        source: 'profile',
        reviewId: '',
      });
    }
  }

  const logs = getWorkoutLogsForClient(normalizedEmail);
  const seriesByExercise = new Map();

  logs.forEach((log) => {
    const logDate = isIsoDate(log.completedAt) ? new Date(log.completedAt).toISOString() : nowIso();
    const dayTitle = String(log.dayTitle || 'Sesion').trim() || 'Sesion';
    const dayId = String(log.dayId || '').trim();

    (Array.isArray(log.exercises) ? log.exercises : []).forEach((exercise) => {
      const exerciseName = String(exercise?.name || '').trim();
      const weightKg = parseWorkoutWeightKg(exercise?.weight);
      if (!exerciseName || !weightKg) return;

      if (!seriesByExercise.has(exerciseName)) {
        seriesByExercise.set(exerciseName, []);
      }

      seriesByExercise.get(exerciseName).push({
        recordedAt: logDate,
        weightKg,
        dayTitle,
        dayId,
      });
    });
  });

  const exerciseWeightHistory = Array.from(seriesByExercise.entries())
    .map(([exerciseName, points]) => ({
      exerciseName,
      points: points.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()),
    }))
    .filter((series) => series.points.length > 0)
    .sort((a, b) => {
      if (b.points.length !== a.points.length) {
        return b.points.length - a.points.length;
      }
      return a.exerciseName.localeCompare(b.exerciseName);
    });

  return {
    bodyWeightHistory,
    exerciseWeightHistory,
  };
}

function ensureClientRecords(email, options = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || normalizedEmail === COACH_EMAIL) {
    return null;
  }

  const existing = store.users.find((user) => user.email === normalizedEmail);
  if (!existing) {
    store.users.push({
      email: normalizedEmail,
      password: String(options.password || ''),
      role: 'CLIENT',
      name: options.name || displayNameFromEmail(normalizedEmail),
      status: 'active',
      createdAt: nowIso(),
    });
  } else {
    if (options.password && !existing.password) {
      existing.password = String(options.password);
    }
    if (options.name) {
      existing.name = options.name;
    }
  }

  if (!store.profiles[normalizedEmail]) {
    const name = options.name || existing?.name;
    store.profiles[normalizedEmail] = buildDefaultProfile(normalizedEmail, name);
  }

  const currentName = options.name || existing?.name || displayNameFromEmail(normalizedEmail);
  if (!store.plans[normalizedEmail] || isLegacyGenericPlan(store.plans[normalizedEmail])) {
    store.plans[normalizedEmail] = buildDefaultPlan(normalizedEmail, currentName);
  }

  store.plans[normalizedEmail] = normalizeStoredPlan(
    store.plans[normalizedEmail],
    normalizedEmail,
    currentName,
  );

  if (!Array.isArray(store.plans[normalizedEmail]?.monthlyPlan) || store.plans[normalizedEmail].monthlyPlan.length === 0) {
    const templateKey = inferPlanTemplateKey(normalizedEmail, currentName);
    const monthlyGoal = store.plans[normalizedEmail]?.monthlyGoal || 'Plan mensual';
    store.plans[normalizedEmail].monthlyPlan = buildDefaultMonthlyPlan(templateKey, monthlyGoal);
  }

  ensureProgressPhotosStore();
  if (!Array.isArray(store.progressPhotos[normalizedEmail])) {
    store.progressPhotos[normalizedEmail] = [];
  }
  store.progressPhotos[normalizedEmail] = sanitizeProgressPhotosCollection(store.progressPhotos[normalizedEmail]);

  const clientUsers = store.users.filter((user) => user.role === 'CLIENT');
  if (clientUsers.length === 1) {
    const currentPlan = store.plans[normalizedEmail];
    if (currentPlan?.source !== 'CUSTOM') {
      store.plans[normalizedEmail] = buildSingleClientExamplePlan();
    }
  }

  return store.users.find((user) => user.email === normalizedEmail) || null;
}

function ensureStoreConsistency() {
  const coachUser = store.users.find((user) => user.email === COACH_EMAIL);
  if (!coachUser) {
    store.users.unshift({
      email: COACH_EMAIL,
      password: COACH_PASSWORD,
      role: 'COACH',
      name: 'Carlota',
      status: 'active',
      createdAt: nowIso(),
    });
  } else {
    coachUser.role = 'COACH';
    coachUser.password = coachUser.password || COACH_PASSWORD;
    coachUser.name = coachUser.name || 'Carlota';
    coachUser.status = coachUser.status || 'active';
  }

  envClientCredentials.forEach((password, email) => {
    ensureClientRecords(email, { password });
  });

  store.resources = mergeLibrarySeedResources(store.resources);

  if (!store.messages || !Array.isArray(store.messages)) {
    store.messages = [];
  }

  if (!store.reviews || !Array.isArray(store.reviews)) {
    store.reviews = [];
  }

  if (!store.notifications || !Array.isArray(store.notifications)) {
    store.notifications = [];
  }

  ensureProgressPhotosStore();
  ensureWorkoutLogsStore();

  if (!store.profiles || typeof store.profiles !== 'object') {
    store.profiles = {};
  }

  if (!store.plans || typeof store.plans !== 'object') {
    store.plans = {};
  }

  store.users
    .filter((user) => user.role === 'CLIENT')
    .forEach((user) => {
      ensureClientRecords(user.email, { name: user.name, password: user.password });
    });

  const clientUsers = store.users.filter((user) => user.role === 'CLIENT');
  if (clientUsers.length === 1) {
    const uniqueClient = clientUsers[0];
    const currentPlan = store.plans[uniqueClient.email];
    const isCustomPlan = currentPlan?.source === 'CUSTOM';
    if (!isCustomPlan) {
      store.plans[uniqueClient.email] = buildSingleClientExamplePlan();
    }
  }
}

async function loadStore() {
  try {
    const raw = await readFile(dataPath, 'utf-8');
    store = JSON.parse(raw);
  } catch {
    store = buildDefaultStore();
  }
  ensureStoreConsistency();
  await persistStore();
}

async function persistStore() {
  const snapshot = JSON.stringify(store, null, 2);
  persistQueue = persistQueue
    .then(async () => {
      await mkdir(dataDir, { recursive: true });
      await writeFile(dataPath, snapshot, 'utf-8');
    })
    .catch((error) => {
      console.error('Error persisting store:', error);
    });
  return persistQueue;
}

function getCorsHeaders(req) {
  const requestOrigin = req.headers.origin || '';
  let allowOrigin = '*';

  if (ALLOWED_ORIGINS.length > 0) {
    allowOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    Vary: 'Origin',
  };
}

function json(req, res, statusCode, body) {
  res.writeHead(statusCode, {
    ...getCorsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}

function signTokenId(tokenId) {
  return createHmac('sha256', SESSION_SECRET).update(tokenId).digest('hex');
}

function createAuthToken() {
  const tokenId = randomUUID();
  const signature = signTokenId(tokenId);
  return `${tokenId}.${signature}`;
}

function parseBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

function readSession(req) {
  const token = parseBearerToken(req);
  if (!token) {
    return null;
  }

  const [tokenId, signature] = token.split('.');
  if (!tokenId || !signature) {
    return null;
  }

  if (signTokenId(tokenId) !== signature) {
    return null;
  }

  const session = sessions.get(tokenId);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(tokenId);
    return null;
  }

  return { tokenId, ...session };
}

async function parseJsonBody(req) {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_JSON_BODY_BYTES) {
      throw new Error('Body too large');
    }
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

function getClientUser(email) {
  const normalizedEmail = normalizeEmail(email);
  const user = store.users.find((item) => item.email === normalizedEmail && item.role === 'CLIENT');
  return user || null;
}

function getUserForLogin(email) {
  const normalizedEmail = normalizeEmail(email);
  return store.users.find((item) => item.email === normalizedEmail) || null;
}

function getExpectedPassword(user) {
  if (!user) return '';
  if (user.role === 'COACH') {
    return String(user.password || COACH_PASSWORD);
  }
  return String(user.password || '');
}

function sanitizeReviewPayload(payload) {
  const weightKg = Number(payload.weightKg || 0);
  const energy = Number(payload.energy || 0);
  const sleep = Number(payload.sleep || 0);
  const stress = Number(payload.stress || 0);
  const adherence = Number(payload.adherence || 0);
  const comments = String(payload.comments || '').trim();

  return { weightKg, energy, sleep, stress, adherence, comments };
}

function buildReviewSummaryForClient(email) {
  const reviews = store.reviews
    .filter((review) => review.clientEmail === normalizeEmail(email))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const pendingReviews = reviews.filter((review) => review.status === 'pending').length;
  const latestReview = reviews[0] || null;
  const latestFeedbackReview = reviews.find((review) => review.status === 'completed' && review.feedback) || null;
  const currentWeekKey = getIsoWeekKey(new Date());
  const alreadySubmittedThisWeek = reviews.some((review) => review.weekKey === currentWeekKey);

  const nextWeekDate = getStartOfIsoWeek(new Date());
  nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7);

  return {
    pendingReviews,
    latestReview,
    latestFeedback: latestFeedbackReview
      ? {
          feedback: latestFeedbackReview.feedback,
          reviewedAt: latestFeedbackReview.reviewedAt,
          reviewId: latestFeedbackReview.id,
        }
      : null,
    canSubmitWeeklyCheckIn: !alreadySubmittedThisWeek,
    nextEligibleAt: alreadySubmittedThisWeek ? nextWeekDate.toISOString() : null,
  };
}

function pushNotification(notification) {
  store.notifications.unshift({
    id: randomUUID(),
    createdAt: nowIso(),
    readAt: null,
    ...notification,
  });
}

function summarizeCoachDashboard() {
  const clients = store.users.filter((user) => user.role === 'CLIENT');
  const reviewsSorted = [...store.reviews].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const pendingReviews = reviewsSorted.filter((review) => review.status === 'pending');
  const completedReviews = reviewsSorted.filter((review) => review.status === 'completed');
  const adherenceAvg =
    reviewsSorted.length > 0
      ? Math.round(reviewsSorted.reduce((acc, review) => acc + Number(review.adherence || 0), 0) / reviewsSorted.length)
      : 0;

  const clientsWithSummary = clients.map((client) => {
    const clientReviews = reviewsSorted.filter((review) => review.clientEmail === client.email);
    const latestReview = clientReviews[0] || null;
    const pending = clientReviews.find((review) => review.status === 'pending') || null;
    return {
      email: client.email,
      name: client.name || displayNameFromEmail(client.email),
      status: client.status || 'active',
      lastCheckInAt: latestReview?.submittedAt || null,
      lastReviewStatus: latestReview?.status || null,
      pendingReviewId: pending?.id || null,
      latestWeightKg: latestReview?.weightKg || null,
    };
  });

  return {
    stats: {
      clientsCount: clients.length,
      pendingReviewsCount: pendingReviews.length,
      completedReviewsCount: completedReviews.length,
      adherenceAvg,
    },
    clients: clientsWithSummary,
  };
}

function getClientListForCoach() {
  const dashboard = summarizeCoachDashboard();
  return dashboard.clients;
}

function requireAuth(req, res) {
  const session = readSession(req);
  if (!session) {
    json(req, res, 401, { message: 'No autenticado' });
    return null;
  }
  return session;
}

function requireCoach(req, res) {
  const session = requireAuth(req, res);
  if (!session) {
    return null;
  }
  if (session.user.role !== 'COACH') {
    json(req, res, 403, { message: 'Solo coach' });
    return null;
  }
  return session;
}

function sanitizeProfileBody(body, fallbackEmail) {
  const normalizedEmail = normalizeEmail(body.email || fallbackEmail);
  const injuries = Array.isArray(body.injuries)
    ? body.injuries.map((value) => String(value || '').trim()).filter(Boolean)
    : [];

  return {
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    email: normalizedEmail,
    phone: String(body.phone || '').trim(),
    birthDate: isIsoDate(body.birthDate) ? String(body.birthDate).slice(0, 10) : '',
    heightCm: Number(body.heightCm || 0),
    startWeightKg: Number(body.startWeightKg || 0),
    currentWeightKg: Number(body.currentWeightKg || 0),
    bio: String(body.bio || '').trim(),
    injuries,
    avatarUrl: String(body.avatarUrl || '').trim(),
  };
}

function sanitizeMonthlyPlan(rawMonthly, monthlyGoal) {
  const source = Array.isArray(rawMonthly) ? rawMonthly : [];
  const sanitized = source
    .map((item, index) => ({
      id: String(item.id || randomUUID()),
      weekLabel: String(item.weekLabel || `Semana ${index + 1}`).trim(),
      focus: String(item.focus || '').trim(),
      objective: String(item.objective || monthlyGoal || '').trim(),
      status: ['completed', 'current', 'upcoming'].includes(String(item.status || ''))
        ? String(item.status)
        : 'upcoming',
    }))
    .filter((item) => item.weekLabel && (item.focus || item.objective));

  return sanitized.length > 0
    ? sanitized
    : buildDefaultMonthlyPlan('hipertrofia', monthlyGoal || 'Plan mensual');
}

function sanitizePlanBody(body) {
  const monthlyGoal = String(body.monthlyGoal || '').trim();
  const weeklySchedule = sanitizeWeeklySchedule(body.weeklySchedule);
  const normalizedMonthlyPlan = sanitizeMonthlyPlan(body.monthlyPlan, monthlyGoal);

  return {
    monthlyGoal,
    weeklySchedule,
    monthlyPlan: normalizedMonthlyPlan,
  };
}

function sanitizeResourceBody(body) {
  return {
    title: String(body.title || '').trim(),
    category: String(body.category || '').trim(),
    muscle: String(body.muscle || '').trim(),
    description: String(body.description || '').trim(),
    videoUrl: String(body.videoUrl || '').trim(),
  };
}

function sanitizeProgressPhotoBody(body) {
  const rawWeight = Number(body.weightKg);
  const weightKg =
    Number.isFinite(rawWeight) && rawWeight > 0
      ? Math.round(rawWeight * 10) / 10
      : null;

  return {
    view: sanitizeProgressPhotoView(body.view),
    imageData: String(body.imageData || '').trim(),
    weightKg,
  };
}

async function handleApi(req, res, requestUrl) {
  await loadPromise;
  const pathname = requestUrl.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    res.end();
    return;
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!email || !password || !email.includes('@')) {
      return json(req, res, 400, { message: 'Correo y contrasena obligatorios' });
    }

    const userRecord = getUserForLogin(email);

    if (email === COACH_EMAIL) {
      const expectedCoachPassword = getExpectedPassword(userRecord);
      if (password !== expectedCoachPassword) {
        return json(req, res, 401, { message: 'Credenciales incorrectas' });
      }
    }

    if (email !== COACH_EMAIL) {
      const existingUser = getClientUser(email);
      const envPassword = envClientCredentials.get(email);

      if (existingUser) {
        if (existingUser.password && existingUser.password !== password) {
          return json(req, res, 401, { message: 'Credenciales incorrectas' });
        }
        if (!existingUser.password) {
          existingUser.password = password;
        }
      } else if (envPassword) {
        if (envPassword !== password) {
          return json(req, res, 401, { message: 'Credenciales incorrectas' });
        }
        ensureClientRecords(email, { password: envPassword });
      } else if (ALLOW_OPEN_CLIENT_LOGIN && envClientCredentials.size === 0) {
        ensureClientRecords(email, { password });
      } else {
        return json(req, res, 401, { message: 'Credenciales incorrectas' });
      }
    }

    const finalUserRecord = getUserForLogin(email);
    if (!finalUserRecord) {
      return json(req, res, 401, { message: 'Credenciales incorrectas' });
    }

    const user = {
      email: finalUserRecord.email,
      role: finalUserRecord.role,
    };

    const token = createAuthToken();
    const [tokenId] = token.split('.');
    sessions.set(tokenId, {
      user,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    await persistStore();
    return json(req, res, 200, { user, token });
  }

  if (pathname === '/api/session' && req.method === 'GET') {
    const session = readSession(req);
    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }
    return json(req, res, 200, { user: session.user });
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const session = readSession(req);
    if (session) {
      sessions.delete(session.tokenId);
    }
    return json(req, res, 200, { success: true });
  }

  if (pathname === '/api/clients' && req.method === 'GET') {
    const session = requireCoach(req, res);
    if (!session) return;
    const clients = getClientListForCoach();
    return json(req, res, 200, { clients });
  }

  if (pathname === '/api/clients' && req.method === 'POST') {
    const session = requireCoach(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const email = normalizeEmail(body.email);
    const password = String(body.password || '').trim();
    const name = String(body.name || '').trim();

    if (!email || !email.includes('@') || !password) {
      return json(req, res, 400, { message: 'Email y password son obligatorios' });
    }

    if (password.length < 6) {
      return json(req, res, 400, { message: 'La contrasena debe tener al menos 6 caracteres' });
    }

    if (getUserForLogin(email)) {
      return json(req, res, 409, { message: 'Ya existe un usuario con ese correo' });
    }

    ensureClientRecords(email, { password, name });
    await persistStore();

    const client = getClientListForCoach().find((item) => item.email === email);
    return json(req, res, 201, { client });
  }

  if (pathname === '/api/messages' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const partnerEmail =
      session.user.role === 'COACH'
        ? normalizeEmail(requestUrl.searchParams.get('with'))
        : COACH_EMAIL;

    if (!partnerEmail || !partnerEmail.includes('@')) {
      return json(req, res, 400, { message: 'Falta parametro "with"' });
    }

    if (session.user.role === 'COACH' && !getClientUser(partnerEmail)) {
      return json(req, res, 404, { message: 'Cliente no encontrado' });
    }

    const key = getConversationKey(session.user.email, partnerEmail);
    const messages = store.messages
      .filter((message) => message.conversationKey === key)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return json(req, res, 200, { messages });
  }

  if (pathname === '/api/messages' && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const toEmail = normalizeEmail(body.toEmail);
    const text = String(body.text || '').trim();

    if (!toEmail || !text) {
      return json(req, res, 400, { message: 'toEmail y text son obligatorios' });
    }

    if (session.user.role === 'CLIENT' && toEmail !== COACH_EMAIL) {
      return json(req, res, 403, { message: 'Un cliente solo puede escribir al coach' });
    }

    if (session.user.role === 'COACH') {
      if (toEmail === COACH_EMAIL) {
        return json(req, res, 403, { message: 'Destino invalido' });
      }
      if (!getClientUser(toEmail)) {
        return json(req, res, 404, { message: 'Cliente no encontrado' });
      }
    }

    const message = {
      id: randomUUID(),
      conversationKey: getConversationKey(session.user.email, toEmail),
      senderEmail: session.user.email,
      senderRole: session.user.role,
      text,
      createdAt: nowIso(),
    };

    store.messages.push(message);
    await persistStore();
    return json(req, res, 201, { message });
  }

  if (pathname === '/api/checkins' && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (session.user.role !== 'CLIENT') {
      return json(req, res, 403, { message: 'Solo clientes' });
    }

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const payload = sanitizeReviewPayload(body);
    if (
      payload.weightKg <= 0 ||
      payload.energy < 1 ||
      payload.energy > 10 ||
      payload.sleep < 1 ||
      payload.sleep > 10 ||
      payload.stress < 1 ||
      payload.stress > 10 ||
      payload.adherence < 1 ||
      payload.adherence > 10
    ) {
      return json(req, res, 400, { message: 'Faltan datos validos del check-in' });
    }

    const submittedAt = nowIso();
    const weekKey = getIsoWeekKey(submittedAt);
    const alreadyExists = store.reviews.some(
      (review) => review.clientEmail === session.user.email && review.weekKey === weekKey,
    );

    if (alreadyExists) {
      const nextWeekDate = getStartOfIsoWeek(new Date());
      nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7);
      return json(req, res, 409, {
        message: 'Ya has enviado tu check-in esta semana. Podras enviar uno nuevo la proxima semana.',
        nextEligibleAt: nextWeekDate.toISOString(),
      });
    }

    ensureClientRecords(session.user.email);
    const clientProfile = store.profiles[session.user.email];
    if (clientProfile) {
      clientProfile.currentWeightKg = payload.weightKg;
    }

    const clientUser = getClientUser(session.user.email);
    const review = {
      id: randomUUID(),
      weekKey,
      clientEmail: session.user.email,
      clientName: clientUser?.name || displayNameFromEmail(session.user.email),
      submittedAt,
      status: 'pending',
      weightKg: payload.weightKg,
      energy: payload.energy,
      sleep: payload.sleep,
      stress: payload.stress,
      adherence: payload.adherence,
      comments: payload.comments,
      feedback: '',
      reviewedAt: null,
      reviewedBy: null,
    };

    store.reviews.unshift(review);
    pushNotification({
      recipientType: 'COACH',
      recipientEmail: COACH_EMAIL,
      type: 'checkin_submitted',
      title: 'Nuevo check-in pendiente',
      message: `${review.clientName} ha enviado su check-in semanal.`,
      referenceId: review.id,
    });
    await persistStore();
    return json(req, res, 201, { review });
  }

  if (pathname === '/api/checkins/status' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (session.user.role !== 'CLIENT') {
      return json(req, res, 403, { message: 'Solo clientes' });
    }

    const summary = buildReviewSummaryForClient(session.user.email);
    return json(req, res, 200, summary);
  }

  if (pathname === '/api/reviews' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const reviews =
      session.user.role === 'COACH'
        ? [...store.reviews]
        : store.reviews.filter((review) => review.clientEmail === session.user.email);

    reviews.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return json(req, res, 200, { reviews });
  }

  const reviewFeedbackMatch = pathname.match(/^\/api\/reviews\/([^/]+)\/feedback$/);
  if (reviewFeedbackMatch && req.method === 'POST') {
    const session = requireCoach(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const feedback = String(body.feedback || '').trim();
    if (!feedback) {
      return json(req, res, 400, { message: 'Feedback obligatorio' });
    }

    const reviewId = reviewFeedbackMatch[1];
    const targetReview = store.reviews.find((review) => review.id === reviewId);
    if (!targetReview) {
      return json(req, res, 404, { message: 'Revision no encontrada' });
    }

    targetReview.feedback = feedback;
    targetReview.status = 'completed';
    targetReview.reviewedAt = nowIso();
    targetReview.reviewedBy = session.user.email;

    pushNotification({
      recipientType: 'CLIENT',
      recipientEmail: targetReview.clientEmail,
      type: 'feedback_ready',
      title: 'Feedback disponible',
      message: 'Tu coach ha revisado tu check-in semanal.',
      referenceId: targetReview.id,
    });

    await persistStore();
    return json(req, res, 200, { review: targetReview });
  }

  if (pathname === '/api/notifications' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const notifications = store.notifications
      .filter((notification) => {
        if (session.user.role === 'COACH') {
          return notification.recipientType === 'COACH';
        }
        return (
          notification.recipientType === 'CLIENT' &&
          normalizeEmail(notification.recipientEmail) === session.user.email
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return json(req, res, 200, { notifications });
  }

  const notificationReadMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notificationReadMatch && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;
    const notificationId = notificationReadMatch[1];
    const notification = store.notifications.find((item) => item.id === notificationId);

    if (!notification) {
      return json(req, res, 404, { message: 'Notificacion no encontrada' });
    }

    if (session.user.role === 'COACH' && notification.recipientType !== 'COACH') {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    if (
      session.user.role === 'CLIENT' &&
      (notification.recipientType !== 'CLIENT' ||
        normalizeEmail(notification.recipientEmail) !== session.user.email)
    ) {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    notification.readAt = nowIso();
    await persistStore();
    return json(req, res, 200, { notification });
  }

  if (pathname === '/api/profile' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const requestedEmail = normalizeEmail(requestUrl.searchParams.get('email'));
    const targetEmail =
      session.user.role === 'COACH' && requestedEmail
        ? requestedEmail
        : session.user.email;

    if (session.user.role === 'COACH' && targetEmail !== COACH_EMAIL && !getClientUser(targetEmail)) {
      return json(req, res, 404, { message: 'Cliente no encontrado' });
    }

    if (session.user.role === 'CLIENT' && targetEmail !== session.user.email) {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    if (targetEmail === COACH_EMAIL) {
      return json(req, res, 200, {
        profile: buildDefaultProfile(COACH_EMAIL, 'Carlota'),
      });
    }

    ensureClientRecords(targetEmail);
    return json(req, res, 200, { profile: store.profiles[targetEmail] });
  }

  if (pathname === '/api/profile' && req.method === 'PUT') {
    const session = requireAuth(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const requestedEmail = normalizeEmail(requestUrl.searchParams.get('email'));
    const targetEmail =
      session.user.role === 'COACH' && requestedEmail
        ? requestedEmail
        : session.user.email;

    if (session.user.role === 'CLIENT' && targetEmail !== session.user.email) {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    if (targetEmail === COACH_EMAIL) {
      return json(req, res, 403, { message: 'Perfil de coach no editable por API' });
    }

    ensureClientRecords(targetEmail);
    const sanitized = sanitizeProfileBody(body, targetEmail);
    if (!sanitized.firstName || !sanitized.email) {
      return json(req, res, 400, { message: 'Nombre y correo son obligatorios' });
    }

    store.profiles[targetEmail] = sanitized;
    const client = getClientUser(targetEmail);
    if (client) {
      client.name = `${sanitized.firstName} ${sanitized.lastName}`.trim() || client.name;
    }

    await persistStore();
    return json(req, res, 200, { profile: store.profiles[targetEmail] });
  }

  if (pathname === '/api/progress/photos' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const requestedEmail = normalizeEmail(requestUrl.searchParams.get('email'));
    const targetEmail =
      session.user.role === 'COACH' && requestedEmail
        ? requestedEmail
        : session.user.email;

    if (session.user.role === 'CLIENT' && targetEmail !== session.user.email) {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    if (session.user.role === 'COACH' && !getClientUser(targetEmail)) {
      return json(req, res, 404, { message: 'Cliente no encontrado' });
    }

    if (targetEmail === COACH_EMAIL) {
      return json(req, res, 400, { message: 'El coach no tiene panel de fotos de progreso' });
    }

    ensureClientRecords(targetEmail);
    const photos = getProgressPhotosForClient(targetEmail);
    return json(req, res, 200, { photos });
  }

  if (pathname === '/api/progress/metrics' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const requestedEmail = normalizeEmail(requestUrl.searchParams.get('email'));
    const targetEmail =
      session.user.role === 'COACH' && requestedEmail
        ? requestedEmail
        : session.user.email;

    if (session.user.role === 'CLIENT' && targetEmail !== session.user.email) {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    if (session.user.role === 'COACH' && !getClientUser(targetEmail)) {
      return json(req, res, 404, { message: 'Cliente no encontrado' });
    }

    if (targetEmail === COACH_EMAIL) {
      return json(req, res, 400, { message: 'El coach no tiene metricas de progreso de cliente' });
    }

    ensureClientRecords(targetEmail);
    const metrics = buildProgressMetricsForClient(targetEmail);
    return json(req, res, 200, metrics);
  }

  if (pathname === '/api/progress/photos' && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    if (session.user.role !== 'CLIENT') {
      return json(req, res, 403, { message: 'Solo los clientes pueden subir fotos' });
    }

    const targetEmail = session.user.email;

    if (targetEmail === COACH_EMAIL) {
      return json(req, res, 400, { message: 'El coach no puede subir fotos en este panel' });
    }

    const payload = sanitizeProgressPhotoBody(body);
    if (!payload.imageData.startsWith('data:image/')) {
      return json(req, res, 400, { message: 'Debes subir una imagen valida' });
    }

    ensureClientRecords(targetEmail);
    const photos = getProgressPhotosForClient(targetEmail);
    const photo = {
      id: randomUUID(),
      view: payload.view,
      imageData: payload.imageData,
      weightKg: payload.weightKg,
      uploadedAt: nowIso(),
      uploadedBy: session.user.email,
    };
    photos.push(photo);
    store.progressPhotos[targetEmail] = sanitizeProgressPhotosCollection(photos);

    await persistStore();
    return json(req, res, 201, { photo, photos: store.progressPhotos[targetEmail] });
  }

  if (pathname === '/api/plan' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const requestedEmail = normalizeEmail(requestUrl.searchParams.get('email'));
    const targetEmail =
      session.user.role === 'COACH' && requestedEmail
        ? requestedEmail
        : session.user.email;

    if (session.user.role === 'CLIENT' && targetEmail !== session.user.email) {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    if (targetEmail === COACH_EMAIL) {
      return json(req, res, 200, { plan: buildDefaultPlan() });
    }

    ensureClientRecords(targetEmail);
    return json(req, res, 200, { plan: store.plans[targetEmail] });
  }

  if (pathname === '/api/plan' && req.method === 'PUT') {
    const session = requireAuth(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const requestedEmail = normalizeEmail(requestUrl.searchParams.get('email'));
    const targetEmail =
      session.user.role === 'COACH' && requestedEmail
        ? requestedEmail
        : session.user.email;

    if (session.user.role === 'CLIENT' && targetEmail !== session.user.email) {
      return json(req, res, 403, { message: 'No autorizado' });
    }

    if (targetEmail === COACH_EMAIL) {
      return json(req, res, 403, { message: 'Plan de coach no editable por API' });
    }

    ensureClientRecords(targetEmail);
    const payload = sanitizePlanBody(body);
    if (payload.weeklySchedule.length === 0) {
      return json(req, res, 400, { message: 'El plan semanal no puede estar vacio' });
    }

    store.plans[targetEmail] = {
      monthlyGoal: payload.monthlyGoal || store.plans[targetEmail]?.monthlyGoal || '',
      weeklySchedule: payload.weeklySchedule,
      monthlyPlan: payload.monthlyPlan,
      source: 'CUSTOM',
      updatedAt: nowIso(),
      updatedBy: session.user.email,
    };

    await persistStore();
    return json(req, res, 200, { plan: store.plans[targetEmail] });
  }

  if (pathname === '/api/plan/day-status' && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const dayId = String(body.dayId || '').trim();
    const status = String(body.status || '').trim();
    if (!dayId || !['completed', 'today', 'upcoming'].includes(status)) {
      return json(req, res, 400, { message: 'dayId y status validos son obligatorios' });
    }

    const targetEmail =
      session.user.role === 'COACH'
        ? normalizeEmail(body.email)
        : session.user.email;

    if (!targetEmail || targetEmail === COACH_EMAIL) {
      return json(req, res, 400, { message: 'Cliente invalido' });
    }

    if (session.user.role === 'COACH' && !getClientUser(targetEmail)) {
      return json(req, res, 404, { message: 'Cliente no encontrado' });
    }

    ensureClientRecords(targetEmail);
    const plan = store.plans[targetEmail];
    const day = plan.weeklySchedule.find((item) => item.id === dayId);
    if (!day) {
      return json(req, res, 404, { message: 'Dia de plan no encontrado' });
    }

    if (Array.isArray(body.workoutExercises) && Array.isArray(day.workoutExercises)) {
      const weightByExerciseId = new Map(
        body.workoutExercises
          .map((item) => {
            const id = String(item?.id || '').trim();
            if (!id) return null;
            return [id, String(item?.weight || item?.peso || '').trim()];
          })
          .filter(Boolean),
      );

      day.workoutExercises = day.workoutExercises.map((exercise) => {
        const currentId = String(exercise.id || '').trim();
        const hasUpdate = weightByExerciseId.has(currentId);
        return {
          ...exercise,
          weight: hasUpdate ? String(weightByExerciseId.get(currentId) || '') : String(exercise.weight || '').trim(),
        };
      });
      day.exercises = day.workoutExercises.length;
    }

    if (status === 'completed') {
      trackCompletedWorkoutLog(targetEmail, day, session.user.email);
    }

    day.status = status;
    plan.updatedAt = nowIso();
    plan.updatedBy = session.user.email;
    await persistStore();
    return json(req, res, 200, { plan });
  }

  if (pathname === '/api/library' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;
    const resources = [...store.resources].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return json(req, res, 200, { resources });
  }

  if (pathname === '/api/library' && req.method === 'POST') {
    const session = requireCoach(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const payload = sanitizeResourceBody(body);
    if (!payload.title || !payload.category || !payload.muscle) {
      return json(req, res, 400, { message: 'Titulo, categoria y musculo son obligatorios' });
    }

    const resource = {
      id: randomUUID(),
      ...payload,
      createdAt: nowIso(),
      createdBy: session.user.email,
    };

    store.resources.unshift(resource);
    await persistStore();
    return json(req, res, 201, { resource });
  }

  if (pathname === '/api/dashboard/coach' && req.method === 'GET') {
    const session = requireCoach(req, res);
    if (!session) return;
    const dashboard = summarizeCoachDashboard();
    return json(req, res, 200, dashboard);
  }

  if (pathname === '/api/dashboard/client' && req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (session.user.role !== 'CLIENT') {
      return json(req, res, 403, { message: 'Solo clientes' });
    }

    ensureClientRecords(session.user.email);
    const profile = store.profiles[session.user.email];
    const summary = buildReviewSummaryForClient(session.user.email);
    const reviews = store.reviews
      .filter((review) => review.clientEmail === session.user.email)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const adherenceAvg =
      reviews.length > 0
        ? Math.round(reviews.reduce((acc, review) => acc + Number(review.adherence || 0), 0) / reviews.length)
        : 0;

    return json(req, res, 200, {
      profile,
      summary,
      metrics: {
        totalCheckIns: reviews.length,
        adherenceAvg,
        latestWeightKg: profile?.currentWeightKg || null,
      },
    });
  }

  if (pathname === '/api/password' && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const currentPassword = String(body.currentPassword || '').trim();
    const newPassword = String(body.newPassword || '').trim();
    const confirmPassword = String(body.confirmPassword || '').trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return json(req, res, 400, { message: 'Debes completar todos los campos' });
    }

    if (newPassword !== confirmPassword) {
      return json(req, res, 400, { message: 'La confirmacion no coincide' });
    }

    if (newPassword.length < 6) {
      return json(req, res, 400, { message: 'La nueva contrasena debe tener al menos 6 caracteres' });
    }

    const user = getUserForLogin(session.user.email);
    if (!user) {
      return json(req, res, 404, { message: 'Usuario no encontrado' });
    }

    const expectedPassword = getExpectedPassword(user);
    if (expectedPassword !== currentPassword) {
      return json(req, res, 401, { message: 'Contrasena actual incorrecta' });
    }

    user.password = newPassword;
    await persistStore();
    return json(req, res, 200, { success: true });
  }

  return json(req, res, 404, { message: 'Not found' });
}

async function serveStatic(res, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const targetPath = path.normalize(path.join(distDir, relativePath));

  if (!targetPath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const file = await readFile(targetPath);
    const extension = path.extname(targetPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
    });
    res.end(file);
  } catch {
    try {
      const indexFile = await readFile(path.join(distDir, 'index.html'));
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(indexFile);
    } catch {
      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Build not found. Run npm run build first.');
    }
  }
}

const loadPromise = loadStore();

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname.startsWith('/api/')) {
    return handleApi(req, res, requestUrl);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(JSON.stringify({ message: 'Method not allowed' }));
    return;
  }

  await serveStatic(res, requestUrl.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Karra backend listening on http://localhost:${PORT}`);
});
