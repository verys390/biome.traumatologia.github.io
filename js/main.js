/* ===============================
   BIOME - main.js
   =============================== */
'use strict';

/* =========================================================
   Utilidades generales (avisos, bootstrap, debug)
========================================================= */
const ensureNoticeInfra = (() => {
  let ready = false;
  return () => {
    if (ready) return;
    const wrap = document.createElement('div');
    wrap.id = 'js-notices';
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-atomic', 'true');
    Object.assign(wrap.style, {
      position: 'fixed', right: '14px', bottom: '14px',
      display: 'grid', gap: '8px', zIndex: '20000'
    });
    document.body.appendChild(wrap);

    const st = document.createElement('style');
    st.textContent = `
      .js-notice{font:14px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans";
        padding:.6rem .75rem;border-radius:10px;border:1px solid rgba(0,0,0,.06);
        box-shadow:0 10px 26px rgba(15,23,42,.16);background:#fff;color:#0f172a;max-width:320px}
      .js-notice.info{border-color:rgba(13,110,253,.25)}
      .js-notice.success{border-color:rgba(25,135,84,.25)}
      .js-notice.warning{border-color:rgba(255,193,7,.35)}
      .js-notice.danger{border-color:rgba(220,53,69,.35)}
      .js-notice strong{font-weight:600}
    `;
    document.head.appendChild(st);
    ready = true;
  };
})();

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

let _bootstrapWarned = false;
const hasBootstrapModal = () => {
  const ok = !!(window.bootstrap && window.bootstrap.Modal);
  if (!ok && !_bootstrapWarned) {
    _bootstrapWarned = true;
    showNotice('<strong>Atención:</strong> no se pudo abrir la ventana porque <em>Bootstrap</em> no está cargado.', 'warning');
    console.warn('[BIOME] Bootstrap Modal no disponible.');
  }
  return ok;
};

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
document.addEventListener('DOMContentLoaded', debugIds);

/* =========================================================
   WhatsApp
========================================================= */
const WA_NUMBER = '5492344404004';
const buildWaUrl = (text) => {
  const msg = encodeURIComponent(
    text || 'Buenos días. Me gustaría solicitar un turno de Traumatología con la Dra. Verónica Gallego. ¿Podrían informarme la próxima disponibilidad?'
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
    const defaultMsg = id === 'ctaHero'
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
attachWaSubmit('turnoForm',  (d, n, t) => `Hola, soy ${n} (${t}). Quiero un turno. Motivo: ${d.get('motivo')}`);

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
      img.removeAttribute('src');
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
  cards.forEach((c) => { c.classList.remove('d-none'); loadImagesInside(c); });
  currentRegion = 'todas';
};
const showRegion = (region) => {
  hideAll();
  const subset = cards.filter((c) => c.dataset.region === region);
  if (!subset.length) showNotice('No hay contenidos para esa categoría.', 'info', 2500);
  subset.forEach((c) => { c.classList.remove('d-none'); loadImagesInside(c); });
  currentRegion = region;
};
if (grid) { prepareLazyImages(); hideAll(); }
regionBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const region = btn.dataset.region;
    const already = btn.classList.contains('active');
    regionBtns.forEach((b) => { b.classList.remove('active','border-primary','shadow'); b.setAttribute('aria-pressed','false'); });
    if (already || currentRegion === region) { hideAll(); currentRegion = 'todas'; }
    else {
      btn.classList.add('active','border-primary','shadow');
      btn.setAttribute('aria-pressed','true');
      showRegion(region);
      grid?.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  });
});
showAllBtn?.addEventListener('click', () => {
  regionBtns.forEach((b) => { b.classList.remove('active','border-primary','shadow'); b.setAttribute('aria-pressed','false'); });
  showAll();
  grid?.scrollIntoView({ behavior:'smooth', block:'start' });
});

/* =========================================================
   Diccionario de patologías (para modal)
========================================================= */
const PATOLOGIAS = {
  /* --- Fracturas --- */
  'fractura-muneca': { titulo:'Fractura de muñeca', img:'img/muneca.jpg',
    quees:'Fractura ósea habitual del radio distal, típica de caídas sobre la mano extendida. Produce dolor, inflamación y a veces deformidad visible.',
    sintomas:['Dolor intenso y aumento de volumen en la muñeca','Dificultad o imposibilidad para mover o cargar','Deformidad o “escalón” (según el trazo de fractura)'],
    consultar:['Dolor intenso con imposibilidad de uso','Deformidad evidente o compromiso de piel','Hormigueo, palidez o frialdad en la mano (signos neurovasculares)'],
    hacer:['Inmovilizar de forma provisoria y elevar el miembro','Aplicar frío local intermitente (protegiendo la piel)','Acudir a evaluación para radiografías y tratamiento (yeso o cirugía según caso)']
  },
  'fractura-clavicula': { titulo:'Fractura de clavícula', img:'img/clavicula.jpg',
    quees:'Lesión frecuente tras caída sobre el hombro o traumatismo directo. Suele causar dolor inmediato, hematoma y dificultad para movilizar el brazo.',
    sintomas:['Dolor y sensibilidad marcada sobre la clavícula','Hematoma e inflamación; posible “escalón” óseo','Limitación para elevar el brazo por dolor'],
    consultar:['Dolor intenso o deformidad evidente','Parestesias en brazo/mano o compromiso cutáneo','Traumatismo de alta energía o dolor que no cede'],
    hacer:['Uso de cabestrillo y analgesia indicada','Hielo local y reposo relativo, evitando cargas','Control traumatológico para definir tratamiento y rehabilitación']
  },
  'fractura-humero': { titulo:'Fractura de húmero proximal', img:'img/humero.jpg',
    quees:'Fractura en la parte alta del húmero (cabeza/cuello), típica en adultos mayores por caída doméstica. Puede generar dolor intenso y gran hematoma en hombro y brazo.',
    sintomas:['Dolor agudo en hombro con impotencia funcional','Hematoma y aumento de volumen progresivo','Limitación marcada para elevar o rotar el brazo'],
    consultar:['Dolor intenso o deformidad','Hormigueo, pérdida de fuerza o palidez en la mano','Caídas en pacientes con osteoporosis o comorbilidades'],
    hacer:['Inmovilización inicial (cabestrillo) y analgesia indicada','Aplicar frío local y elevar ligeramente el brazo','Radiografías para definir yeso/órtesis o cirugía y plan de rehabilitación']
  },
  'fractura-tobillo': { titulo:'Fractura de tobillo', img:'img/fractura-tobillo.jpg',
    quees:'Ruptura de uno o más huesos que forman el tobillo (tibia, peroné y/o astrágalo). Puede ser simple o compleja.',
    sintomas:['Dolor intenso con movimiento o apoyo','Hinchazón y hematoma rápidos','Impotencia para caminar o apoyar','Deformidad visible en casos graves'],
    consultar:['Imposibilidad de apoyar o caminar','Deformidad evidente o exposición ósea','Signos neurovasculares','Traumatismo de alta energía'],
    hacer:['Inmovilizar y elevar el miembro','Evitar apoyar hasta evaluación','Radiografías / TAC según caso','Tratamiento: yeso/bota o cirugía + rehabilitación']
  },

  /* --- Columna --- */
  'lumbalgia': { titulo:'Lumbalgia', img:'img/lumbar.jpg',
    quees:'Dolor en la parte baja de la espalda, generalmente de origen mecánico.',
    sintomas:['Dolor localizado o irradiado','Rigidez que mejora con el movimiento','Alivio con ejercicios guiados'],
    consultar:['Dolor persistente','Síntomas neurológicos','Traumatismo importante'],
    hacer:['Actividad progresiva y adaptada','Fortalecimiento y movilidad','Higiene postural']
  },
  'cervicalgia': { titulo:'Cervicalgia', img:'img/cervicalgia.jpg',
    quees:'Dolor en la zona cervical, generalmente de origen mecánico.',
    sintomas:['Dolor/rigidez cervical','Cefalea tensional','Molestia al girar el cuello o sostener posturas'],
    consultar:['Dolor persistente','Síntomas neurológicos','Traumatismo o fiebre'],
    hacer:['Pausas activas y movilidad suave','Fortalecimiento cervical/escapular','Ergonomía en trabajo/vida diaria']
  },
  'escoliosis': { titulo:'Escoliosis', img:'img/escoliosis.jpg',
    quees:'Desviación lateral de la columna (a menudo con rotación vertebral).',
    sintomas:['Asimetría de hombros/caderas','Dolor muscular y fatiga postural','Rigidez dorsal o lumbar','Giba en test de Adams'],
    consultar:['Evaluación clínica + Rx (ángulo de Cobb)','Dolor persistente o progresión','Síntomas neurológicos','Sospecha en niños/adolescentes'],
    hacer:['Ejercicios posturales y core','Ergonomía','Kinesiología específica (p.ej. Schroth)','Corset según indicación','Valoración quirúrgica si es grave']
  },
  'hipercifosis-dorsal': { titulo:'Hipercifosis dorsal', img:'img/hipercifosis-dorsal.jpg',
    quees:'Aumento de la curvatura dorsal (“joroba”).',
    sintomas:['Dolor interescapular','Rigidez y menor extensión torácica','Cabeza adelantada / hombros caídos','Contracturas'],
    consultar:['Dolor persistente o progresión','Síntomas neurológicos o dolor nocturno','Dificultad respiratoria','Sospecha en adolescentes'],
    hacer:['Corrección postural y movilidad torácica','Fortalecer extensores y glúteos / activar core','Estirar pectorales y flexores de cadera','Ergonomía','Kinesiología; en casos seleccionados corset/valoración quirúrgica']
  },
  'artrosis-vertebral': { titulo:'Artrosis vertebral', img:'img/artrosis-vertebral.jpg',
    quees:'Desgaste progresivo de las articulaciones de la columna.',
    sintomas:['Dolor mecánico','Rigidez al iniciar movimiento','Crujidos','Posible irradiación si hay compromiso radicular'],
    consultar:['Dolor persistente que limita','Síntomas neurológicos','Dolor nocturno/banderas rojas','Trauma reciente'],
    hacer:['Analgésicos/antiinflamatorios (si corresponde)','Kinesiología: movilidad, postura y core','Ergonomía y pausas activas','Aeróbico bajo impacto','Infiltraciones/valoración quirúrgica en seleccionados']
  },
  'estenosis-canal-lumbar': { titulo:'Estenosis de canal lumbar', img:'img/estenosis-canal-lumbar.jpg',
    quees:'Estrechamiento del canal lumbar con compresión radicular (claudicación neurógena).',
    sintomas:['Dolor lumbar irradiado','Calambres/hormigueo','Debilidad y pesadez al caminar','Alivio al sentarse/flexionar'],
    consultar:['Limitación progresiva pese a medidas','Déficit neurológico','Alteraciones esfínteres (urgencia)','Banderas rojas'],
    hacer:['Movilidad en flexión / core / glúteos','Caminatas fraccionadas / bici estática','Medicamentos si corresponde','Higiene postural y peso','RM para confirmar; bloqueos/descompresión si no responde']
  },

  /* --- Miembro superior / inferior (se mantienen) --- */
  'tendinitis-hombro': { titulo:'Tendinitis del hombro', img:'img/tendinitis.jpg',
    quees:'Inflamación de tendones del manguito rotador.',
    sintomas:['Dolor al elevar el brazo','Molestia nocturna','Debilidad'],
    consultar:['>2–3 semanas sin mejora','Pérdida súbita de fuerza','Luxación/trauma importante'],
    hacer:['Reposo relativo (no inmovilizar largo)','Movilidad y fortalecimiento progresivo','Ergonomía y adaptación de tareas']
  },
  'manguito-rotador': { titulo:'Síndrome del manguito rotador', img:'img/manguito.jpg',
    quees:'Lesión por sobreuso o degeneración de tendones del hombro.',
    sintomas:['Dolor 60°–120°','Debilidad en altura','Molestias nocturnas','Rigidez'],
    consultar:['Dolor persistente','Pérdida súbita de fuerza','Trauma'],
    hacer:['Reposo relativo y movilidad','Fortalecer manguito/estabilizadores','Ergonomía y adaptación']
  },
  'tunel-carpiano': { titulo:'Síndrome del túnel carpiano', img:'img/tunel.jpg',
    quees:'Compresión del nervio mediano.',
    sintomas:['Hormigueo nocturno en 1º-3º dedo','Dolor que irradia','Disminución de fuerza'],
    consultar:['Síntomas persistentes','Atrofia tenar','Dolor progresivo'],
    hacer:['Ergonomía y pausas','Férula nocturna','Movilidad neural y fortalecimiento']
  },
  'ganglion-muneca': { titulo:'Ganglión de muñeca', img:'img/ganglion.jpg',
    quees:'Quiste sinovial benigno.',
    sintomas:['Bulto variable','Molestia con carga/extensión','Rigidez'],
    consultar:['Dolor/limitación significativa','Cambios rápidos de tamaño','Hormigueo'],
    hacer:['Vigilancia si asintomático','Adaptar actividades / férula','Punción o cirugía según caso']
  },
  'dedo-resorte': { titulo:'Dedo en resorte', img:'img/dedoresorte.jpg',
    quees:'Engrosamiento del tendón flexor o polea A1.',
    sintomas:['Dolor base del dedo','Chasquido/enganche','Rigidez matinal'],
    consultar:['Bloqueo persistente','Sin mejoría','Varios dedos comprometidos'],
    hacer:['Reposo relativo','Deslizamiento tendinoso / estiramientos','Férula/infiltración/cirugía según evolución']
  },

  'artrosis-rotula': { titulo:'Artrosis de rótula', img:'img/rotula.jpg',
    quees:'Desgaste del cartílago femoropatelar.',
    sintomas:['Dolor al escaleras/cuclillas','Crepitación','Signo del cine'],
    consultar:['Dolor que limita','Derrame/bloqueo/inestabilidad','Sin respuesta a medidas'],
    hacer:['VMO + glúteos','Control de carga/técnica','Aeróbico bajo impacto / peso']
  },
  'artrosis-rodilla': { titulo:'Artrosis de rodilla', img:'img/rodilla.jpg',
    quees:'Desgaste tibiofemoral y/o femoropatelar.',
    sintomas:['Dolor con carga','Rigidez breve inicial','Crujidos / menor rango'],
    consultar:['Derrame o bloqueo','Dolor nocturno','Limitación marcada'],
    hacer:['Fuerza (cuádriceps/isquios/glúteos)+propiocepción','Aeróbico bajo impacto','Peso y ayudas técnicas']
  },
  'artrosis-cadera': { titulo:'Artrosis de cadera', img:'img/artrosis-cadera.jpg',
    quees:'Desgaste del cartílago coxofemoral.',
    sintomas:['Dolor inguinal','Rigidez corta','Dificultad para calzarse'],
    consultar:['Dolor que limita AVDs','Cojera/bloqueo','Fallo de manejo conservador'],
    hacer:['Glúteos y core / marcha','Aeróbico bajo impacto / peso','Adaptar cargas/ergonomía']
  },
  'impacto-femoroacetabular': { titulo:'Impacto femoroacetabular (FAI)', img:'img/femoro-acetabular.jpg',
    quees:'Conflicto mecánico CAM/PINCER/mixto.',
    sintomas:['Dolor inguinal con flexión/rotación','Clics/enganche','Menor flexión/RI'],
    consultar:['Dolor que limita deporte/AVDs','Bloqueo/inestabilidad','Trauma o progresión'],
    hacer:['Evitar pinzamientos mantenidos','Movilidad específica + glúteos/rotadores','Control lumbopélvico; imágenes si no mejora']
  },
  'bursitis-trocanterica': { titulo:'Bursitis trocantérica', img:'img/bursitis.jpg',
    quees:'Inflamación de la bursa del trocánter mayor.',
    sintomas:['Dolor lateral al caminar/recostarse','Sensibilidad local'],
    consultar:['Dolor que interfiere el descanso','Concomitante lumbar/radicular','Falla de medidas conservadoras'],
    hacer:['Reducir carga / mecánica de marcha','Glúteo medio / estabilizadores pélvicos','Estiramientos; superficies/calzado; terapia guiada']
  },
  'lesion-labrum-acetabular': { titulo:'Lesión del labrum acetabular', img:'img/labrum.jpg',
    quees:'Daño del anillo fibrocartilaginoso que aporta estabilidad.',
    sintomas:['Dolor inguinal con giros','Clics/enganche e inestabilidad','Rigidez / menos rango'],
    consultar:['Dolor persistente con limitación','Bloqueo o chasquidos persistentes','Fallo de manejo conservador o trauma'],
    hacer:['Movilidad evitando pinzamientos','Glúteos / control lumbopélvico','Educación y adaptación; derivación si no progresa']
  },
  'esguince-tobillo': { titulo:'Esguince de tobillo (lateral)', img:'img/esguince-tobillo.jpg',
    quees:'Lesión de ligamentos laterales (inversión).',
    sintomas:['Dolor lateral','Hinchazón/hematomas','Dificultad para apoyar'],
    consultar:['No puede caminar 4 pasos','Deformidad / sospecha de fractura','Dolor óseo en zonas Ottawa','Sin mejora en 48–72 h','Esguinces repetidos'],
    hacer:['Reposo relativo, elevación, compresión; hielo','Bota walker (≈2 sem) si lo indicaron','Kine sin dolor (flexo-extensión/círculos)','Propiocepción y peroneos + glúteo medio','Vuelta gradual con tape/tobillera sin dolor']
  },
  'inestabilidad-tobillo': { titulo:'Inestabilidad crónica de tobillo', img:'img/inestabilidad-tobillo.jpg',
    quees:'Sensación de flojera tras esguinces con mala recuperación.',
    sintomas:['Torceduras repetidas','Dolor/inflamación recurrente','Dificultad para deporte'],
    consultar:['Episodios pese a cuidados','Sensación persistente de afloje','Sin mejora con kine','Sospecha de lesión asociada'],
    hacer:['Kine + propiocepción 6–12 semanas','Tobilleras en impacto','Reentrenamiento de marcha/control neuromuscular','Imágenes si dudas','Cirugía en casos severos']
  },
  'tendinitis-aquiles': { titulo:'Tendinitis del tendón de Aquiles', img:'img/tendinitis-aquiles.jpg',
    quees:'Inflamación aguda por sobrecarga o esfuerzo.',
    sintomas:['Dolor posterior','Inflamación/calor','Rigidez matinal','Dolor al caminar/correr'],
    consultar:['No mejora en 1–2 semanas','Dificultad marcada para caminar o puntas','Sospecha de rotura','Aumento brusco de carga / antecedentes'],
    hacer:['Reposo relativo + hielo 48–72 h','Fármacos si corresponde','Kine: movilidad + excéntricos','Calzado/taloneras; revisar técnica/superficie','Reeducación antes del impacto']
  },
  'ruptura-aquiles': { titulo:'Ruptura del tendón de Aquiles', img:'img/ruptura-aquiles.jpg',
    quees:'Rotura parcial o completa del tendón.',
    sintomas:['“Patada/chasquido” súbito','Dolor intenso','No puede ponerse en puntas','Hinchazón y pérdida de fuerza'],
    consultar:['Urgente: dolor con chasquido y déficit','Imposibilidad para puntas/deambular','Hendidura palpable','Lesión durante salto/sprint'],
    hacer:['Inmovilizar en equino y no apoyar','Hielo y elevación','Consulta URGENTE + eco/RM','Definir conservador/quirúrgico + rehabilitación']
  }
};

/* =========================================================
   Modal Bootstrap de “Patologías” (robusta)
========================================================= */
(() => {
  const patoModalEl = document.getElementById('patoModal');
  if (!patoModalEl) return;

  const modalTitle   = patoModalEl.querySelector('.modal-title');
  const modalImg     = document.getElementById('patoImg');
  const modalBody    = document.getElementById('patoContenido');
  const btnInsta     = document.getElementById('btnInsta');
  const btnPatoTurno = document.getElementById('btnPatoTurno');

  // Guardamos la última key clickeada (fallback cuando relatedTarget viene vacío)
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-bs-target="#patoModal"][data-key]');
    if (btn) patoModalEl.dataset.currentKey = (btn.dataset.key || '').trim();
  });

  const resetModal = () => {
    if (modalTitle) modalTitle.textContent = '';
    if (modalImg)   { modalImg.removeAttribute('src'); modalImg.alt = ''; }
    if (modalBody)  modalBody.innerHTML = '<p class="text-muted mb-0">Cargando…</p>';
  };

  patoModalEl.addEventListener('show.bs.modal', (event) => {
    try {
      resetModal();

      const triggerBtn = event.relatedTarget;
      const rawKey = triggerBtn?.getAttribute('data-key') || patoModalEl.dataset.currentKey || '';
      const key = rawKey.trim();
      const d = key ? PATOLOGIAS[key] : null;

      if (!d) {
        console.warn('[Patologías] clave no encontrada:', JSON.stringify(rawKey));
        if (modalTitle) modalTitle.textContent = 'Contenido no disponible';
        if (modalBody)  modalBody.innerHTML = '<p class="text-danger mb-0">No se pudo cargar esta patología.</p>';
        showNotice('Contenido no disponible para esta patología.', 'warning');
        return;
      }

      if (modalTitle) modalTitle.textContent = d.titulo;
      if (modalImg)   { modalImg.src = d.img; modalImg.alt = d.titulo; }

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

      const turnoMsg = 'Buenos días. Me gustaría solicitar un turno de Traumatología con la Dra. Verónica Gallego. ¿Podrían informarme la próxima disponibilidad?';
      const waHref = buildWaUrl(turnoMsg);
      if (btnPatoTurno) btnPatoTurno.href = waHref;
    } catch (e) {
      console.error('[Patologías] error en modal:', e);
      showNotice('Ocurrió un error al armar la información.', 'danger');
    }
  });
})();

/* =========================================================
   Bienestar / Profesionales: modal dinámica
========================================================= */
(() => {
  const M = {
    'terapia-ocupacional': {
      titulo: 'Terapia ocupacional',
      quees: 'Promueve autonomía y participación en actividades de la vida diaria mediante adaptación de tareas, entorno y uso de ayudas técnicas.',
      aporta: ['Entrenamiento en AVD (vestido, higiene, cocina, trabajo).','Férulas y productos de apoyo cuando corresponde.','Estrategias para conservar energía y evitar dolor.'],
      cuando: ['Tras cirugías de miembro superior o mano.','Dolor crónico que limita la función.','Necesidad de adaptar el hogar o el puesto laboral.'],
      incluye: ['Evaluación del desempeño y objetivos.','Plan de entrenamiento funcional.','Educación a paciente/familia y seguimiento.'],
    },
    'kinesiologia': {
      titulo: 'Kinesiología',
      quees: 'Aborda dolor, movilidad y fuerza con ejercicio terapéutico y reeducación del movimiento, integrando terapia manual cuando es indicado.',
      aporta: ['Disminución del dolor al movimiento.','Recuperación de rangos y fuerza.','Prevención de recaídas con autocuidado.'],
      cuando: ['Lumbalgia, cervicalgia, tendinopatías.','Postquirúrgico o post-inmovilización.','Reintegro progresivo al deporte o trabajo.'],
      incluye: ['Ejercicio dosificado y progresivo.','Educación y ergonomía.','Plan personalizado.'],
    },
    'pilates': {
      titulo: 'Pilates terapéutico',
      quees: 'Control del core, respiración y movilidad con bajo impacto; útil en columna y hombro.',
      aporta: ['Mejora del control lumbopélvico y postura.','Fuerza y flexibilidad sin sobrecargar.','Conciencia corporal y respiración.'],
      cuando: ['Dolor lumbar/cervical mecánico.','Disfunciones escapulares u hombro.','Recuperación tras alta de kinesiología.'],
      incluye: ['Sesiones guiadas y adaptadas.','Progresiones seguras (suelo/aparatos).','Plan de ejercicios en casa.'],
    },
    'yoga': {
      titulo: 'Yoga adaptado',
      quees: 'Movilidad global, respiración y manejo del estrés, con asanas ajustadas.',
      aporta: ['Flexibilidad y fuerza suave.','Regulación del sistema nervioso.','Mejor descanso y bienestar.'],
      cuando: ['Dolor mecánico.','Estrés/ansiedad vinculados al dolor.','Hábitos sostenibles.'],
      incluye: ['Posturas y respiración adaptadas.','Progresiones graduales y seguras.','Contraindicaciones revisadas.'],
    },
    'natacion': {
      titulo: 'Natación / Hidrocinesia',
      quees: 'Trabajo en agua para movilizar y fortalecer con bajo impacto.',
      aporta: ['Mejora aeróbica.','Movilidad sin dolor por flotación.','Fortalecimiento global.'],
      cuando: ['Artrosis de rodilla y cadera.','Reacondicionamiento general.','Exceso de impacto articular.'],
      incluye: ['Técnica y dosificación según nivel.','Hidrocinesia guiada si hace falta.','Plan complementario fuera del agua.'],
    },
    'ergonomia-postural': {
      titulo: 'Ergonomía y ejercicios posturales',
      quees: 'Hábitos y técnica para trabajar, estudiar y moverte sin sobrecargar.',
      aporta: ['Pausas activas efectivas.','Levantamiento seguro de objetos.','Prevención de recurrencias.'],
      cuando: ['Jornadas sentado/de pie.','Dolor por posturas mantenidas.','Inicio de actividad física.'],
      incluye: ['Evaluación y educación postural.','Rutina breve y sostenible.','Ajustes de entorno (alturas, apoyos).'],
    },
  };

  const proModalEl = document.getElementById('proModal');
  if (!proModalEl) return;

  const modalTitle = proModalEl.querySelector('.modal-title');
  const modalBody  = document.getElementById('proContenido');
  const btnInfo    = document.getElementById('btnProInfo');   // opcional (Instagram)
  const btnTurno   = document.getElementById('btnProTurno');  // WhatsApp

  const renderCols = (t, arr) => `
    <div class="col-md-4">
      <h6 class="mb-2">${t}</h6>
      <ul class="mb-0">${arr.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`;

  const fillProModal = (key) => {
    const d = key ? M[key] : null;
    if (!d) {
      console.warn('[Bienestar] Clave inexistente:', key);
      showNotice('Contenido no disponible para esta opción.', 'warning');
      if (modalTitle) modalTitle.textContent = 'Bienestar y profesionales';
      if (modalBody)  modalBody.innerHTML = '<p class="text-muted mb-0">No se pudo cargar la información.</p>';
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

    // Más info (Instagram) – si existe el botón en el HTML
    if (btnInfo) {
      const INSTAGRAM = 'https://www.instagram.com/biome.traumatologia';
      btnInfo.href = `${INSTAGRAM}?utm_source=web&utm_medium=modal&utm_campaign=bienestar&pro=${encodeURIComponent(key)}`;
      btnInfo.classList.remove('d-none');
    }

    // Sacar turno (WhatsApp)
    if (btnTurno) {
      btnTurno.href = buildWaUrl('Hola, quisiera consultar por esta especialidad: ' + d.titulo);
      btnTurno.target = '_blank';
      btnTurno.rel = 'noopener';
      btnTurno.setAttribute('aria-label', 'Abrir WhatsApp para solicitar turno');
      btnTurno.innerHTML = `<i class="fa-solid fa-calendar-check me-2" aria-hidden="true"></i>Sacar turno`;
    }

    return true;
  };

  // Método 1: Bootstrap (data-bs-toggle)
  proModalEl.addEventListener('show.bs.modal', (ev) => {
    try {
      const trigger = ev.relatedTarget;
      const key = trigger?.getAttribute('data-pro');
      fillProModal(key);
    } catch (e) {
      console.error('[Bienestar] error en show:', e);
      showNotice('No se pudo abrir la ventana. Intentalo nuevamente.', 'danger');
    }
  });

  // Método 2: por JS (si hubiera botones sin data-bs-toggle)
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-pro]');
    if (!el) return;
    const hasToggle = el.matches('[data-bs-toggle="modal"]') || el.closest('[data-bs-toggle="modal"]');
    if (hasToggle) return;
    const key = el.getAttribute('data-pro');
    if (!fillProModal(key)) return;
    if (hasBootstrapModal()) {
      try { window.bootstrap.Modal.getOrCreateInstance(proModalEl).show(); }
      catch (e) { console.warn('[Bienestar] Error al abrir modal:', e); showNotice('No se pudo abrir la ventana.', 'danger'); }
    }
  });
})();
