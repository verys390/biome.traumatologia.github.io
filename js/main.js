/* ===============================
   BIOME - main.js (sin bloque de videos) + mejoras UX/Accesibilidad/Debug
   =============================== */
'use strict';

/* =========================================================
   Utilidades generales (avisos, bootstrap, debug)
========================================================= */

/** Crea un contenedor de avisos accesibles y estilos mínimos la primera vez. */
const ensureNoticeInfra = (() => {
  let ready = false;
  return () => {
    if (ready) return;
    // Contenedor
    const wrap = document.createElement('div');
    wrap.id = 'js-notices';
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-atomic', 'true');
    wrap.style.position = 'fixed';
    wrap.style.right = '14px';
    wrap.style.bottom = '14px';
    wrap.style.display = 'grid';
    wrap.style.gap = '8px';
    wrap.style.zIndex = '20000';
    document.body.appendChild(wrap);
    // Estilos simples para los avisos
    const st = document.createElement('style');
    st.textContent = `
      .js-notice{
        font: 14px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans";
        padding: .6rem .75rem; border-radius: 10px; border:1px solid rgba(0,0,0,.06);
        box-shadow: 0 10px 26px rgba(15,23,42,.16); background:#fff; color:#0f172a; max-width: 320px;
      }
      .js-notice.info    { border-color: rgba(13,110,253,.25) }
      .js-notice.success { border-color: rgba(25,135,84,.25)  }
      .js-notice.warning { border-color: rgba(255,193,7,.35)  }
      .js-notice.danger  { border-color: rgba(220,53,69,.35)  }
      .js-notice strong  { font-weight: 600 }
    `;
    document.head.appendChild(st);
    ready = true;
  };
})();

/** Muestra un aviso flotante accesible. */
const showNotice = (msg, type = 'warning', timeout = 4200) => {
  ensureNoticeInfra();
  const host = document.getElementById('js-notices');
  const el = document.createElement('div');
  el.className = `js-notice ${type}`;
  el.role = 'status';
  el.innerHTML = msg;
  host.appendChild(el);
  if (timeout > 0) {
    setTimeout(() => {
      el.style.transition = 'opacity .25s ease, transform .25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 260);
    }, timeout);
  }
  return el;
};

/** Verifica si Bootstrap Modal está disponible. Si no, avisa visualmente (una sola vez). */
let _bootstrapWarned = false;
const hasBootstrapModal = () => {
  const ok = !!(window.bootstrap && window.bootstrap.Modal);
  if (!ok && !_bootstrapWarned) {
    _bootstrapWarned = true;
    showNotice(
      '<strong>Atención:</strong> no se pudo abrir la ventana porque <em>Bootstrap</em> no está cargado.',
      'warning'
    );
    console.warn('[BIOME] Bootstrap Modal no disponible.');
  }
  return ok;
};

/** (Opcional) Reporta IDs duplicados en modo debug (?debug=ids o localStorage biome:debug-ids=1). */
const debugIds = () => {
  try {
    const qs = new URLSearchParams(location.search);
    const enabled = qs.get('debug') === 'ids' || localStorage.getItem('biome:debug-ids') === '1';
    if (!enabled) return;
    const map = new Map();
    document.querySelectorAll('[id]').forEach(el => {
      const id = el.id;
      map.set(id, (map.get(id) || 0) + 1);
    });
    const dups = [...map.entries()].filter(([, n]) => n > 1);
    if (dups.length) {
      console.group('[BIOME][DEBUG] IDs duplicados');
      dups.forEach(([id, n]) => console.warn(`ID "${id}" repetido ${n} veces`));
      console.groupEnd();
      showNotice('<strong>Debug:</strong> se detectaron IDs duplicados (ver consola).', 'danger', 6000);
    } else {
      showNotice('<strong>Debug:</strong> sin IDs duplicados.', 'success', 2500);
    }
  } catch {}
};
// Ejecuta el debug opcional al cargar
document.addEventListener('DOMContentLoaded', debugIds);

/* =========================================================
   WhatsApp
========================================================= */
const WA_NUMBER = '5492344404004';
const buildWaUrl = (text) => {
  const msg = encodeURIComponent(
    text ||
    'Buenos días. Me gustaría solicitar un turno de Traumatología con la Dra. Verónica Gallego. ¿Podrían informarme la próxima disponibilidad?'
  );
  return `https://wa.me/${WA_NUMBER}?text=${msg}`;
};

/* Año dinámico */
(() => {
  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = new Date().getFullYear();
})();

/* CTAs a WhatsApp (con fallback real en HTML) */
(() => {
  ['ctaHero', 'ctaWaAside', 'waFab'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const defaultMsg =
      id === 'ctaHero'
        ? 'Buenos días. Me gustaría solicitar un turno de Traumatología con la Dra. Verónica Gallego. ¿Podrían informarme la próxima disponibilidad?'
        : undefined;
    el.setAttribute('href', buildWaUrl(defaultMsg));
  });
})();

/* Formularios -> WhatsApp */
const attachWaSubmit = (formId, builder) => {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const nombre = data.get('nombre') || '';
    const telefono = data.get('telefono') || '';
    const msg = builder(data, nombre, telefono);
    window.open(buildWaUrl(msg), '_blank');
  });
};
attachWaSubmit('contactForm', (d, n, t) => `Hola, soy ${n} (${t}). Motivo: ${d.get('mensaje')}`);
attachWaSubmit('turnoForm',   (d, n, t) => `Hola, soy ${n} (${t}). Quiero un turno. Motivo: ${d.get('motivo')}`);

/* =========================================================
   Patologías: filtro + lazy
========================================================= */
const grid = document.getElementById('gridPatos');
const cards = Array.from(grid?.querySelectorAll('[data-region]') || []);
const regionBtns = document.querySelectorAll('[data-role="region"]');
const showAllBtn = document.getElementById('showAll');
let currentRegion = 'todas';

const prepareLazyImages = () => {
  if (!grid) return;
  grid.querySelectorAll('img').forEach((img) => {
    if (!img.dataset.lazySrc) {
      img.dataset.lazySrc = img.getAttribute('src') || '';
      img.removeAttribute('src'); // evita carga al estar ocultas
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    }
  });
};
const loadImagesInside = (el) => {
  el.querySelectorAll('img[data-lazy-src]').forEach((img) => {
    if (!img.getAttribute('src')) img.setAttribute('src', img.dataset.lazySrc);
  });
};
const hideAll = () => cards.forEach((c) => c.classList.add('d-none'));
const showAll = () => {
  cards.forEach((c) => {
    c.classList.remove('d-none');
    loadImagesInside(c);
  });
  currentRegion = 'todas';
};
const showRegion = (region) => {
  hideAll();
  const subset = cards.filter((c) => c.dataset.region === region);
  if (!subset.length) showNotice('No hay contenidos para esa categoría.', 'info', 2500);
  subset.forEach((c) => {
    c.classList.remove('d-none');
    loadImagesInside(c);
  });
  currentRegion = region;
};

// Estado inicial del grid
if (grid) {
  prepareLazyImages();
  hideAll(); // oculta en la home hasta que elijan filtro
}

// Click de categorías (toggle)
regionBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const region = btn.dataset.region;
    const already = btn.classList.contains('active');

    regionBtns.forEach((b) => {
      b.classList.remove('active', 'border-primary', 'shadow');
      b.setAttribute('aria-pressed', 'false');
    });

    if (already || currentRegion === region) {
      hideAll();
      currentRegion = 'todas';
    } else {
      btn.classList.add('active', 'border-primary', 'shadow');
      btn.setAttribute('aria-pressed', 'true');
      showRegion(region);
      grid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Botón “Mostrar todas”
showAllBtn?.addEventListener('click', () => {
  regionBtns.forEach((b) => {
    b.classList.remove('active', 'border-primary', 'shadow');
    b.setAttribute('aria-pressed', 'false');
  });
  showAll();
  grid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* =========================================================
   Diccionario de patologías (para modal)
========================================================= */
const PATOLOGIAS = {
  // --- Fracturas frecuentes
  'fractura-muneca': {
    titulo: 'Fractura de muñeca',
    img: 'img/muneca.jpg',
    quees:
      'Fractura ósea habitual del radio distal, típica de caídas sobre la mano extendida. Produce dolor, inflamación y a veces deformidad visible.',
    sintomas: [
      'Dolor intenso y aumento de volumen en la muñeca',
      'Dificultad o imposibilidad para mover o cargar',
      'Deformidad o “escalón” (según el trazo de fractura)',
    ],
    consultar: [
      'Dolor intenso con imposibilidad de uso',
      'Deformidad evidente o compromiso de piel',
      'Hormigueo, palidez o frialdad en la mano (signos neurovasculares)',
    ],
    hacer: [
      'Inmovilizar de forma provisoria y elevar el miembro',
      'Aplicar frío local intermitente (protegiendo la piel)',
      'Acudir a evaluación para radiografías y tratamiento (yeso o cirugía según caso)',
    ],
  },
  'fractura-clavicula': {
    titulo: 'Fractura de clavícula',
    img: 'img/clavicula.jpg',
    quees:
      'Lesión frecuente tras caída sobre el hombro o traumatismo directo. Suele causar dolor inmediato, hematoma y dificultad para movilizar el brazo.',
    sintomas: [
      'Dolor y sensibilidad marcada sobre la clavícula',
      'Hematoma e inflamación; posible “escalón” óseo',
      'Limitación para elevar el brazo por dolor',
    ],
    consultar: ['Dolor intenso o deformidad evidente', 'Parestesias en brazo/mano o compromiso cutáneo', 'Traumatismo de alta energía o dolor que no cede'],
    hacer: ['Uso de cabestrillo y analgesia indicada', 'Hielo local y reposo relativo, evitando cargas', 'Control traumatológico para definir tratamiento y rehabilitación'],
  },
  'fractura-humero': {
    titulo: 'Fractura de húmero proximal',
    img: 'img/humero.jpg',
    quees:
      'Fractura en la parte alta del húmero (cabeza/cuello), típica en adultos mayores por caída doméstica. Puede generar dolor intenso y gran hematoma en hombro y brazo.',
    sintomas: ['Dolor agudo en hombro con impotencia funcional', 'Hematoma y aumento de volumen progresivo', 'Limitación marcada para elevar o rotar el brazo'],
    consultar: ['Dolor intenso o deformidad', 'Hormigueo, pérdida de fuerza o palidez en la mano', 'Caídas en pacientes con osteoporosis o comorbilidades'],
    hacer: ['Inmovilización inicial (cabestrillo) y analgesia indicada', 'Aplicar frío local y elevar ligeramente el brazo', 'Radiografías para definir yeso/órtesis o cirugía y plan de rehabilitación'],
  },

  // --- Columna
  lumbalgia: {
    titulo: 'Lumbalgia',
    img: 'img/lumbar.jpg',
    quees: 'Dolor en la parte baja de la espalda, generalmente de origen mecánico. Suele relacionarse con sobrecarga física, postural o estrés prolongado.',
    sintomas: ['Dolor localizado o que irradia a glúteos o piernas', 'Rigidez al levantarse que mejora con el movimiento', 'Alivio con actividad guiada y ejercicios progresivos'],
    consultar: ['Dolor persistente que no mejora', 'Síntomas neurológicos (adormecimiento, pérdida de fuerza)', 'Antecedente de traumatismo importante'],
    hacer: ['Actividad física progresiva y adaptada', 'Fortalecimiento y movilidad', 'Hábitos de higiene postural en la vida diaria'],
  },
  cervicalgia: {
    titulo: 'Cervicalgia',
    img: 'img/cervicalgia.jpg',
    quees: 'Dolor en la zona cervical, generalmente de origen mecánico. Suele asociarse a posturas sostenidas, tensión muscular y estrés prolongado.',
    sintomas: ['Dolor y rigidez cervical (a veces irradiado a cabeza u hombros)', 'Cefalea tensional y sensación de sobrecarga', 'Molestia al girar el cuello o sostener posturas'],
    consultar: ['Dolor persistente', 'Síntomas neurológicos (hormigueo, pérdida de fuerza/sensibilidad)', 'Traumatismo importante o fiebre'],
    hacer: ['Pausas activas y movilidad suave, guiada', 'Fortalecimiento cervical y escapular', 'Optimizar ergonomía/postura en trabajo y vida diaria'],
  },

  // --- Miembro superior
  'tendinitis-hombro': {
    titulo: 'Tendinitis del hombro',
    img: 'img/tendinitis.jpg',
    quees:
      'Inflamación de los tendones del manguito rotador, por sobreuso, gestos repetitivos o malas posturas. Dolor al elevar el brazo, molestias nocturnas y limitación funcional.',
    sintomas: ['Dolor al elevar el brazo', 'Molestia nocturna al apoyar el hombro', 'Debilidad progresiva o sobrecarga en tareas cotidianas'],
    consultar: ['Dolor > 2–3 semanas pese a reposo relativo', 'Pérdida súbita de fuerza o imposibilidad de mover', 'Luxación/traumatismo importante'],
    hacer: ['Reposo relativo (evitar dolor), NO inmovilizar prolongado', 'Movilidad suave y fortalecimiento progresivo de manguito/escápula', 'Corregir ergonomía y adaptar actividades'],
  },
  'manguito-rotador': {
    titulo: 'Síndrome del manguito rotador',
    img: 'img/manguito.jpg',
    quees:
      'Lesión por sobreuso o degeneración de los tendones del hombro. Dolor al elevar el brazo, debilidad y molestias nocturnas; puede limitar actividades sobre cabeza.',
    sintomas: ['Dolor entre 60°–120° de elevación', 'Debilidad para tareas en altura', 'Molestias nocturnas', 'Rigidez si no se trata'],
    consultar: ['Dolor persistente sin mejora', 'Pérdida súbita de fuerza', 'Traumatismo asociado'],
    hacer: ['Reposo relativo y movilidad guiada', 'Fortalecer manguito y estabilizadores escapulares', 'Ergonomía y adaptación de actividades'],
  },
  'tunel-carpiano': {
    titulo: 'Síndrome del túnel carpiano',
    img: 'img/tunel.jpg',
    quees:
      'Compresión del nervio mediano por movimientos repetidos, posiciones mantenidas o factores inflamatorios. Cursa con hormigueo, dolor y adormecimiento en pulgar, índice y mayor.',
    sintomas: ['Hormigueo nocturno en los tres primeros dedos', 'Dolor que puede irradiar a antebrazo', 'Disminución de fuerza de prensión o torpeza en pinza fina'],
    consultar: ['Síntomas persistentes sin mejora', 'Pérdida de fuerza o atrofia tenar', 'Dolor intenso/progresivo o patología asociada'],
    hacer: ['Reposo relativo y ergonomía (pausas activas)', 'Férula nocturna en posición neutra', 'Movilidad neural y fortalecimiento de mano/antebrazo'],
  },
  'ganglion-muneca': {
    titulo: 'Ganglión de muñeca',
    img: 'img/ganglion.jpg',
    quees:
      'Quiste sinovial benigno desde cápsula articular o vaina tendinosa (dorso o cara palmar). Puede variar de tamaño y causar dolor o limitación.',
    sintomas: ['Bulto visible o palpable que cambia de tamaño', 'Molestia con carga o extensión forzada', 'Rigidez o tensión en la muñeca'],
    consultar: ['Dolor persistente o limitación significativa', 'Cambios rápidos de tamaño o inflamación marcada', 'Hormigueo/adormecimiento'],
    hacer: ['Vigilancia si es asintomático', 'Adaptar actividades; férula temporal si duele', 'Evaluación para punción o cirugía según indicación'],
  },
  'dedo-resorte': {
    titulo: 'Dedo en resorte (tenosinovitis estenosante)',
    img: 'img/dedoresorte.jpg',
    quees:
      'Engrosamiento del tendón flexor o de la polea A1. Produce chasquido, dolor y bloqueo al flexionar/extender.',
    sintomas: ['Dolor en base del dedo (polea A1)', 'Chasquido o “enganche” al mover', 'Rigidez matinal o bloqueo transitorio'],
    consultar: ['Bloqueo doloroso persistente', 'Falta de mejoría con medidas conservadoras', 'Compromiso de varios dedos'],
    hacer: ['Reposo relativo y adaptación de tareas', 'Deslizamiento tendinoso suave y estiramientos', 'Férula nocturna; considerar infiltración/cirugía según evolución'],
  },

  // --- Miembro inferior
  'artrosis-rotula': {
    titulo: 'Artrosis de rótula (femoropatelar)',
    img: 'img/rotula.jpg',
    quees:
      'Desgaste del cartílago entre rótula y fémur. Puede asociarse a mal alineamiento, sobrecarga repetida o edad. Dolor anterior de rodilla, chasquidos y rigidez breve inicial.',
    sintomas: ['Dolor al subir/bajar escaleras o cuclillas', 'Crepitación y rigidez matinal corta', 'Molestia al estar mucho tiempo sentado (signo del cine)'],
    consultar: ['Dolor persistente que limita actividad', 'Derrame, bloqueo o inestabilidad', 'Empeoramiento pese a medidas conservadoras'],
    hacer: ['Movilidad y fortalecimiento de cuádriceps (VMO) y glúteos', 'Control de carga y técnica de sentadilla', 'Aeróbico de bajo impacto; control de peso si corresponde'],
  },
  'artrosis-rodilla': {
    titulo: 'Artrosis de rodilla (gonartrosis)',
    img: 'img/rodilla.jpg',
    quees:
      'Desgaste progresivo del cartílago tibiofemoral y/o femoropatelar. Dolor mecánico con carga, rigidez corta y limitación funcional.',
    sintomas: ['Dolor al estar de pie, caminar o escaleras', 'Rigidez breve al iniciar la marcha y crujidos', 'Reducción de rango con el tiempo'],
    consultar: ['Derrame persistente o bloqueo', 'Dolor nocturno o deformidad progresiva', 'Limitación marcada en AVDs'],
    hacer: ['Fortalecer cuádriceps, isquios, glúteos + propiocepción', 'Aeróbico de bajo impacto (bici, elíptico, agua)', 'Control de peso y adaptación de cargas/ayudas técnicas'],
  },
  'artrosis-cadera': {
    titulo: 'Artrosis de cadera',
    img: 'img/artrosis-cadera.jpg',
    quees:
      'Desgaste del cartílago de la articulación coxofemoral. Dolor inguinal mecánico, rigidez breve y limitación funcional.',
    sintomas: ['Dolor inguinal con marcha o bipedestación', 'Rigidez corta al iniciar movimiento y crujidos', 'Dificultad para calzarse medias o cruzar piernas'],
    consultar: ['Dolor persistente que limita la vida diaria', 'Cojera, bloqueo o inestabilidad', 'Falta de respuesta a tratamiento conservador'],
    hacer: ['Fortalecer glúteos y core; mejorar marcha', 'Aeróbico de bajo impacto; control de peso', 'Adaptar cargas/ergonomía; evaluar ayudas técnicas'],
  },
  'impacto-femoroacetabular': {
    titulo: 'Impacto femoroacetabular (FAI)',
    img: 'img/femoro-acetabular.jpg',
    quees:
      'Conflicto mecánico entre cuello femoral y acetábulo (CAM, PINCER o mixto). Dolor inguinal con flexión/rotación, chasquidos y rigidez.',
    sintomas: ['Dolor inguinal al estar sentado prolongado, subir al auto o agacharse', 'Clics/enganche al girar', 'Disminución de flexión y rotación interna'],
    consultar: ['Dolor persistente que limita deporte/AVDs', 'Bloqueo o inestabilidad', 'Trauma o progresión de síntomas'],
    hacer: ['Evitar posiciones de pinzamiento mantenidas', 'Movilidad específica y fortalecimiento de glúteos/rotadores', 'Control lumbopélvico; imágenes si no mejora'],
  },
  'bursitis-trocanterica': {
    titulo: 'Bursitis trocantérica',
    img: 'img/bursitis.jpg',
    quees:
      'Inflamación de la bursa del trocánter mayor, asociada a sobreuso o patrón de carga alterado. Dolor lateral de cadera.',
    sintomas: ['Dolor lateral al caminar o subir escaleras', 'Molestia al recostarse del lado afectado', 'Sensibilidad a la palpación del trocánter'],
    consultar: ['Dolor que interfiere con el descanso', 'Coexistencia con dolor lumbar/radicular', 'Sin mejoría con medidas conservadoras'],
    hacer: ['Reducir carga y trabajar mecánica de marcha', 'Fortalecer glúteo medio y estabilizadores pélvicos', 'Estiramientos; superficies/calzado cómodos; terapia guiada si persiste'],
  },
  'lesion-labrum-acetabular': {
    titulo: 'Lesión del labrum acetabular',
    img: 'img/labrum.jpg',
    quees:
      'Daño del labrum (anillo fibrocartilaginoso) que contribuye al sellado/estabilidad de la cadera. Puede asociarse a FAI o traumatismos.',
    sintomas: ['Dolor inguinal con giros/pivoteos', 'Clics/enganche y sensación de inestabilidad', 'Rigidez y reducción de rango'],
    consultar: ['Dolor persistente con limitación', 'Bloqueo doloroso o chasquidos persistentes', 'Fallo de manejo conservador o antecedente de trauma'],
    hacer: ['Movilidad evitando pinzamientos', 'Fortalecer glúteos y control lumbopélvico', 'Educación postural y adaptación de actividades; derivación si no progresa'],
  },
};

/* =========================================================
   Modal Bootstrap de “Patologías”
========================================================= */
(() => {
  const patoModalEl = document.getElementById('patoModal');
  if (!patoModalEl) return;

  const modalTitle = patoModalEl.querySelector('.modal-title');
  const modalImg   = document.getElementById('patoImg');
  const modalBody  = document.getElementById('patoContenido');
  const btnInsta   = document.getElementById('btnInsta');
  const btnPatoTurno = document.getElementById('btnPatoTurno'); // botón WhatsApp patologías

  patoModalEl.addEventListener('show.bs.modal', (event) => {
    const triggerBtn = event.relatedTarget;
    const key = triggerBtn?.getAttribute('data-key');
    const d = key ? PATOLOGIAS[key] : null;

    if (!key || !d) {
      console.warn('[Patologías] Clave no encontrada:', key);
      showNotice('Contenido no disponible para esta patología.', 'warning');
      return;
    }

    if (modalTitle) modalTitle.textContent = d.titulo;
    if (modalImg) { modalImg.src = d.img; modalImg.alt = d.titulo; }

    const col = (t, arr) => `
      <div class="col-md-4">
        <h6 class="mb-2">${t}</h6>
        <ul class="mb-0">${arr.map((i) => `<li>${i}</li>`).join('')}</ul>
      </div>`;

    if (modalBody) {
      modalBody.innerHTML = `
        <h6 class="text-primary">¿Qué es?</h6>
        <p>${d.quees}</p>
        <div class="row g-3">
          ${col('Síntomas', d.sintomas)}
          ${col('Cuándo consultar', d.consultar)}
          ${col('Qué podés hacer', d.hacer)}
        </div>`;
    }

    const INSTAGRAM = 'https://www.instagram.com/biome.traumatologia';
    if (btnInsta) btnInsta.href = `${INSTAGRAM}?utm_source=web&p=${encodeURIComponent(key)}`;

    // Mensaje formal fijo a WhatsApp
    const turnoMsg =
      'Buenos días. Me gustaría solicitar un turno de Traumatología con la Dra. Verónica Gallego. ¿Podrían informarme la próxima disponibilidad?';
    const waHref = buildWaUrl(turnoMsg);
    if (btnPatoTurno) btnPatoTurno.href = waHref;
  });
})();

/* =========================================================
   Bienestar / Profesionales: modal dinámica
========================================================= */
(() => {
  const M = {
    'terapia-ocupacional': {
      titulo: 'Terapia ocupacional',
      quees:  'Promueve autonomía y participación en actividades de la vida diaria mediante adaptación de tareas, entorno y uso de ayudas técnicas.',
      aporta: [
        'Entrenamiento en AVD (vestido, higiene, cocina, trabajo).',
        'Férulas y productos de apoyo cuando corresponde.',
        'Estrategias para conservar energía y evitar dolor.',
      ],
      cuando: [
        'Tras cirugías de miembro superior o mano.',
        'Dolor crónico que limita la función.',
        'Necesidad de adaptar el hogar o el puesto laboral.',
      ],
      incluye: [
        'Evaluación del desempeño y objetivos.',
        'Plan de entrenamiento funcional.',
        'Educación a paciente/familia y seguimiento.',
      ],
    },
    'kinesiologia': {
      titulo: 'Kinesiología',
      quees:  'Aborda dolor, movilidad y fuerza con ejercicio terapéutico y reeducación del movimiento, integrando terapia manual cuando es indicado.',
      aporta: [
        'Disminución del dolor al movimiento.',
        'Recuperación de rangos de movimiento y fuerza específica.',
        'Prevención de recaídas con autocuidado.',
      ],
      cuando: [
        'Lumbalgia, cervicalgia, tendinopatías.',
        'Postquirúrgico o post-inmovilización.',
        'Reintegro progresivo al deporte o trabajo.',
      ],
      incluye: [
        'Ejercicio dosificado y progresivo.',
        'Educación y ergonomía.',
        'Plan personalizado.',
      ],
    },
    'pilates': {
      titulo: 'Pilates terapéutico',
      quees:  'Entrenamiento de control del core, respiración y movilidad con bajo impacto; útil en columna y hombro.',
      aporta: [
        'Mejora del control lumbopélvico y postura.',
        'Fuerza y flexibilidad sin sobrecargar.',
        'Conciencia corporal y patrón respiratorio.',
      ],
      cuando: [
        'Dolor lumbar/cervical mecánico.',
        'Disfunciones escapulares o de hombro.',
        'Recuperación gradual tras alta de kinesiología.',
      ],
      incluye: [
        'Sesiones guiadas y adaptadas.',
        'Progresiones seguras (suelo/aparatos).',
        'Plan de ejercicios en casa.',
      ],
    },
    'yoga': {
      titulo: 'Yoga adaptado',
      quees:  'Movilidad global, respiración y manejo del estrés, con asanas ajustadas a tu condición.',
      aporta: [
        'Flexibilidad y fuerza suave.',
        'Regulación del sistema nervioso.',
        'Mejor descanso y sensación de bienestar.',
      ],
      cuando: [
        'Dolor musculoesquelético mecánico.',
        'Estrés/ansiedad vinculados al dolor.',
        'Búsqueda de hábitos sostenibles.',
      ],
      incluye: [
        'Posturas y respiración adaptadas.',
        'Progresiones graduales y seguras.',
        'Contraindicaciones revisadas previamente.',
      ],
    },
    'natacion': {
      titulo: 'Natación / Hidrocinesia',
      quees:  'Trabajo en agua para movilizar y fortalecer con bajo impacto y descarga articular.',
      aporta: [
        'Mejora de capacidad aeróbica.',
        'Movilidad sin dolor por flotación.',
        'Fortalecimiento global.',
      ],
      cuando: [
        'Artrosis de rodilla y cadera.',
        'Reacondicionamiento general.',
        'Exceso de impacto articular.',
      ],
      incluye: [
        'Técnica y dosificación según nivel.',
        'Hidrocinesia guiada si es necesario.',
        'Plan complementario fuera del agua.',
      ],
    },
    'ergonomia-postural': {
      titulo: 'Ergonomía y ejercicios posturales',
      quees:  'Hábitos y técnica para trabajar, estudiar y moverte sin sobrecargar.',
      aporta: [
        'Pausas activas efectivas.',
        'Posturas correctas al levantar objetos.',
        'Prevención de recurrencias.',
      ],
      cuando: [
        'Jornadas prolongadas sentado/de pie.',
        'Dolor por posturas mantenidas.',
        'Inicio de plan de actividad física.',
      ],
      incluye: [
        'Evaluación y educación postural.',
        'Rutina breve y sostenible.',
        'Ajustes de entorno (alturas, apoyos).',
      ],
    },
  };

  const proModalEl = document.getElementById('proModal');
  if (!proModalEl) return;

  const modalTitle = proModalEl.querySelector('.modal-title');
  const modalBody  = document.getElementById('proContenido');
  const btnTurno   = document.getElementById('btnProTurno'); // botón de la modal de Bienestar

  const renderCols = (t, arr) => `
    <div class="col-md-4">
      <h6 class="mb-2">${t}</h6>
      <ul class="mb-0">${arr.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`;

  /** Llena la modal según la clave del diccionario. */
  const fillProModal = (key) => {
    const d = key ? M[key] : null;
    if (!d) {
      console.warn('[Bienestar] Clave inexistente:', key);
      showNotice('Contenido no disponible para esta opción.', 'warning');
      return false;
    }

    if (modalTitle) modalTitle.textContent = d.titulo;
    if (modalBody) {
      modalBody.innerHTML = `
        <h6 class="text-primary">¿Qué es?</h6>
        <p>${d.quees}</p>
        <div class="row g-3">
          ${renderCols('Qué aporta', d.aporta)}
          ${renderCols('Cuándo conviene', d.cuando)}
          ${renderCols('Qué incluye', d.incluye)}
        </div>`;
    }

    // Botón: ir a Instagram (más información)
    const INSTAGRAM = 'https://www.instagram.com/biome.traumatologia';
    const instaHref = `${INSTAGRAM}?utm_source=web&utm_medium=modal&utm_campaign=bienestar&pro=${encodeURIComponent(key)}`;
    if (btnTurno) {
      btnTurno.href = instaHref;
      btnTurno.target = '_blank';
      btnTurno.rel = 'noopener';
      btnTurno.setAttribute('aria-label', 'Abrir Instagram: más información');
      btnTurno.innerHTML = `<i class="fa-brands fa-instagram me-2" aria-hidden="true"></i>Más info en Instagram`;
    }

    return true;
  };

  /* Método 1: abrir por atributo data-bs-toggle (Bootstrap) */
  proModalEl.addEventListener('show.bs.modal', (ev) => {
    const trigger = ev.relatedTarget;
    const key = trigger?.getAttribute('data-pro');
    fillProModal(key);
  });

  /* Método 2: abrir por JS si hay data-pro pero sin data-bs-toggle */
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-pro]');
    if (!el) return;

    // Si ya tiene data-bs-toggle="modal", dejamos que Bootstrap maneje
    const hasToggle = el.matches('[data-bs-toggle="modal"]') || el.closest('[data-bs-toggle="modal"]');
    if (hasToggle) return;

    const key = el.getAttribute('data-pro');
    if (!fillProModal(key)) return;

    // Abrimos modal o mostramos aviso si falta Bootstrap
    if (hasBootstrapModal()) {
      try {
        window.bootstrap.Modal.getOrCreateInstance(proModalEl).show();
      } catch (e) {
        console.warn('[Bienestar] Error al abrir modal:', e);
        showNotice('No se pudo abrir la ventana. Intentalo nuevamente.', 'danger');
      }
    }
  });
})();
