'use strict';

/* =========================================================
   CONFIG
========================================================= */
const WA_NUMBER = '5492344404004';
const INSTAGRAM = 'https://www.instagram.com/biome.traumatologia';

const buildWaUrl = (text) => {
  const msg = encodeURIComponent(
    text ||
      'Buenos días. Me gustaría solicitar un turno de Traumatología con la Dra. Verónica Gallego. ¿Podrían informarme la próxima disponibilidad?'
  );
  return `https://wa.me/${WA_NUMBER}?text=${msg}`;
};

/* =========================================================
   DOM READY
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Año footer
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Links WhatsApp (hero / aside / FAB / link texto)
  const waHref = buildWaUrl();

  const hero = document.getElementById('ctaHero');
  const aside = document.getElementById('ctaWaAside');
  const fab = document.getElementById('waFab');
  const waText = document.getElementById('waTextLink');

  if (hero) hero.href = waHref;
  if (aside) aside.href = waHref;
  if (fab) fab.href = waHref;

  if (waText) waText.href = buildWaUrl('Hola. Quisiera solicitar un turno.');
});

/* =========================================================
   PATOLOGÍAS (MODAL)
   Keys deben coincidir con data-key del HTML
========================================================= */
const PATOLOGIAS = {
  'lumbalgia': {
    titulo: 'Lumbalgia',
    img: 'img/lumbar.jpg',
    quees:
      'Dolor en la parte baja de la espalda. Suele ser de origen mecánico (sobrecarga, postura, contracturas) y en la mayoría de los casos mejora con medidas conservadoras.',
    sintomas: [
      'Dolor lumbar localizado o irradiado (glúteo/muslo)',
      'Rigidez, sobre todo al levantarse',
      'Empeora con ciertas posturas o esfuerzos',
    ],
    consultar: [
      'Debilidad o pérdida de fuerza en piernas',
      'Alteración de esfínteres o adormecimiento en “silla de montar”',
      'Fiebre, pérdida de peso o dolor nocturno intenso',
      'Dolor que no mejora en 7–10 días',
    ],
    hacer: [
      'Mantener actividad suave (evitar reposo absoluto)',
      'Calor local 15–20 min, 2–3 veces/día',
      'Higiene postural y pausas activas',
      'Ejercicios progresivos de movilidad y fortalecimiento de core',
    ],
  },

  'cervicalgia': {
    titulo: 'Cervicalgia',
    img: 'img/cervicalgia.jpg',
    quees:
      'Dolor en cuello y región cervical, frecuentemente asociado a contractura muscular, postura sostenida (pantallas) o sobrecarga. Puede acompañarse de dolor hacia hombros.',
    sintomas: [
      'Dolor y rigidez cervical',
      'Limitación para girar o inclinar el cuello',
      'Cefalea tensional (dolor occipital)',
      'Molestia hacia trapecios/hombros',
    ],
    consultar: [
      'Hormigueo, adormecimiento o debilidad en brazos/manos',
      'Dolor tras trauma/accidente',
      'Fiebre o rigidez marcada con malestar general',
      'Dolor persistente sin mejoría',
    ],
    hacer: [
      'Pausas cada 45–60 min si trabajás con pantalla',
      'Calor local y estiramientos suaves',
      'Ajustar ergonomía (altura monitor, silla, apoyo lumbar)',
      'Fortalecer cintura escapular con guía profesional',
    ],
  },

  'artrosis-rodilla': {
    titulo: 'Artrosis de rodilla',
    img: 'img/rodilla.jpg',
    quees:
      'Desgaste progresivo del cartílago y estructuras de la articulación. Puede generar dolor con la carga, rigidez y limitación funcional. El objetivo es mejorar función y calidad de vida.',
    sintomas: [
      'Dolor al caminar, subir/bajar escaleras o ponerse en cuclillas',
      'Rigidez (sobre todo al iniciar movimiento)',
      'Inflamación o “derrame” en la rodilla',
      'Crujidos (crepitación) y limitación',
    ],
    consultar: [
      'Inflamación importante o bloqueo articular',
      'Inestabilidad marcada o caídas',
      'Dolor severo que limita actividades básicas',
      'Empeoramiento progresivo pese a tratamiento',
    ],
    hacer: [
      'Fortalecimiento de cuádriceps y glúteos (clave)',
      'Bajar impacto: bici, natación, elíptico',
      'Control de peso si corresponde',
      'Medidas analgésicas según indicación médica',
    ],
  },

  'esguince-tobillo': {
    titulo: 'Esguince de tobillo',
    img: 'img/esguince-tobillo.jpg',
    quees:
      'Lesión de los ligamentos del tobillo por torcedura. Puede ir desde distensión leve hasta ruptura parcial/total. Rehabilitar bien reduce recidivas.',
    sintomas: [
      'Dolor lateral o medial según el ligamento afectado',
      'Inflamación y hematoma',
      'Dolor al apoyar o caminar',
      'Sensación de inestabilidad',
    ],
    consultar: [
      'Imposibilidad de apoyar 4 pasos',
      'Dolor en hueso (maléolos) o deformidad',
      'Inflamación muy rápida e intensa',
      'Persistencia del dolor o inestabilidad',
    ],
    hacer: [
      'Primeras 48h: reposo relativo + hielo + compresión + elevación',
      'Soporte (tobillera) según indicación',
      'Movilidad temprana guiada y propiocepción',
      'Retorno deportivo progresivo con fortalecimiento',
    ],
  },

  'bursitis-trocanterica': {
    titulo: 'Bursitis trocantérica (dolor lateral de cadera)',
    img: 'img/bursitis.jpg',
    quees:
      'Inflamación/irritación de estructuras alrededor del trocánter mayor. Se asocia a sobrecarga, debilidad de glúteos o fricción. Muy frecuente en mujeres y runners.',
    sintomas: [
      'Dolor en la cara lateral de la cadera',
      'Duele al acostarse sobre ese lado',
      'Molestia al subir escaleras o caminar mucho',
      'Dolor a la palpación lateral',
    ],
    consultar: [
      'Dolor que no mejora con medidas iniciales',
      'Dolor intenso con cojera marcada',
      'Antecedente traumático o fiebre',
    ],
    hacer: [
      'Bajar cargas y evitar dormir sobre el lado doloroso',
      'Fortalecer glúteo medio y control de pelvis',
      'Estirar TFL/cintilla iliotibial de forma suave',
      'Kinesiología como pilar del tratamiento',
    ],
  },

  'tunel-carpiano': {
    titulo: 'Síndrome del túnel carpiano',
    img: 'img/tunel.jpg',
    quees:
      'Compresión del nervio mediano en la muñeca. Suele generar hormigueo en pulgar, índice y mayor, especialmente de noche. Se confirma con evaluación y, a veces, estudios.',
    sintomas: [
      'Hormigueo/adormecimiento en pulgar, índice y mayor',
      'Dolor nocturno que despierta',
      'Pérdida de fuerza (se caen objetos)',
      'Molestia al usar mouse/herramientas',
    ],
    consultar: [
      'Debilidad progresiva o atrofia tenar',
      'Síntomas persistentes pese a férula/medidas',
      'Dolor importante o déficit sensitivo marcado',
    ],
    hacer: [
      'Férula nocturna en posición neutra',
      'Pausas y ergonomía en tareas repetitivas',
      'Ejercicios de deslizamiento neural guiados',
      'Evaluación médica para definir tratamiento',
    ],
  },

  'fractura-muneca': {
    titulo: 'Fractura de muñeca',
    img: 'img/muneca.jpg',
    quees:
      'Fractura frecuente por caída sobre la mano extendida. Requiere evaluación clínica e imágenes para definir alineación y necesidad de inmovilización o cirugía.',
    sintomas: [
      'Dolor intenso e hinchazón en muñeca',
      'Deformidad o limitación para mover',
      'Dolor al apoyar o agarrar',
      'Hematoma',
    ],
    consultar: [
      'Deformidad evidente o dolor muy intenso',
      'Hormigueo/adormecimiento en mano',
      'Herida asociada (fractura expuesta)',
      'Imposibilidad de mover dedos por dolor',
    ],
    hacer: [
      'Inmovilizar (férula) y elevar',
      'Hielo local (sin apoyar directo en piel)',
      'Radiografía (y otras imágenes si hace falta)',
      'Seguimiento y rehabilitación post-inmovilización',
    ],
  },

  'tendinitis-hombro': {
    titulo: 'Tendinopatía del manguito rotador (tendinitis de hombro)',
    img: 'img/tendinitis.jpg',
    quees:
      'Dolor por sobrecarga o irritación de tendones del manguito rotador. Suele doler al elevar el brazo y puede asociarse a pinzamiento subacromial.',
    sintomas: [
      'Dolor al levantar el brazo o peinarse',
      'Dolor nocturno al apoyar sobre el hombro',
      'Debilidad o fatiga del hombro',
      'Limitación funcional',
    ],
    consultar: [
      'Pérdida marcada de fuerza tras esfuerzo/trauma',
      'Dolor persistente que no mejora',
      'Limitación importante del rango de movimiento',
    ],
    hacer: [
      'Reposo relativo de actividades por encima de la cabeza',
      'Ejercicios de movilidad y fortalecimiento escapular',
      'Kinesiología con progresión',
      'Evaluación para definir estudios y tratamiento',
    ],
  },

  'tendinitis-aquiles': {
    titulo: 'Tendinopatía de Aquiles',
    img: 'img/tendinitis-aquiles.jpg',
    quees:
      'Lesión por sobreuso del tendón de Aquiles. Produce dolor en el talón o por encima, sobre todo al iniciar la marcha o después de correr/saltar.',
    sintomas: [
      'Dolor matutino al dar los primeros pasos',
      'Dolor al correr, saltar o subir escaleras',
      'Engrosamiento/sensibilidad del tendón',
      'Rigidez posterior del tobillo',
    ],
    consultar: [
      'Dolor súbito con “latigazo” (sospecha de ruptura)',
      'Dificultad para ponerse en puntas de pie',
      'Dolor persistente pese a bajar cargas',
    ],
    hacer: [
      'Bajar impacto (reposo relativo) y progresión guiada',
      'Fortalecimiento excéntrico (muy útil) con supervisión',
      'Calzado adecuado y control de cargas',
      'Kinesiología para retorno seguro',
    ],
  },
};

/* =========================================================
   MODAL PATOLOGÍAS (reutilizable)
========================================================= */
(() => {
  const patoModalEl = document.getElementById('patoModal');
  if (!patoModalEl) return;

  const modalTitle = document.getElementById('patoTitle');
  const modalImg = document.getElementById('patoImg');
  const modalBody = document.getElementById('patoContenido');
  const btnInsta = document.getElementById('btnInsta');
  const btnPatoTurno = document.getElementById('btnPatoTurno');

  const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

  const col = (t, arr) => `
    <div class="col-md-4">
      <h6 class="mb-2">${t}</h6>
      <ul class="mb-0">
        ${safeArray(arr).map((i) => `<li>${i}</li>`).join('')}
      </ul>
    </div>`;

  patoModalEl.addEventListener('show.bs.modal', (event) => {
    const trigger = event.relatedTarget;
    const key = trigger?.getAttribute('data-key')?.trim();
    const d = key ? PATOLOGIAS[key] : null;

    if (!d) {
      if (modalTitle) modalTitle.textContent = 'Contenido no disponible';
      if (modalImg) {
        modalImg.removeAttribute('src');
        modalImg.alt = '';
      }
      if (modalBody) {
        modalBody.innerHTML = '<p class="text-muted mb-0">No se pudo cargar esta patología.</p>';
      }
      if (btnInsta) btnInsta.href = INSTAGRAM;
      if (btnPatoTurno) btnPatoTurno.href = buildWaUrl();
      return;
    }

    // Título + imagen
    if (modalTitle) modalTitle.textContent = d.titulo || 'Patología';
    if (modalImg) {
      modalImg.src = d.img || '';
      modalImg.alt = d.titulo || 'Patología';
    }

    // Contenido
    if (modalBody) {
      modalBody.innerHTML = `
        <h6 class="text-primary">¿Qué es?</h6>
        <p>${d.quees || ''}</p>

        <div class="row g-3">
          ${col('Síntomas', d.sintomas)}
          ${col('Cuándo consultar', d.consultar)}
          ${col('Qué podés hacer', d.hacer)}
        </div>
      `;
    }

    // Links
    if (btnInsta) btnInsta.href = `${INSTAGRAM}?utm_source=web&p=${encodeURIComponent(key)}`;
    if (btnPatoTurno) btnPatoTurno.href = buildWaUrl();
  });
})();