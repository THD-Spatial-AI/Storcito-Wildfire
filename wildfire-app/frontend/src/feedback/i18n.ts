import type { Language } from "./types";

export interface Translations {
  // Overlay tooltip
  selectReady: string;
  selectWaiting: string;
  back: string;

  // Step 1
  q1: string;
  emojiLabels: [string, string, string, string, string];

  // Step 2
  q2: string;
  typeLabels: { bug: string; feature: string; question: string };
  submitWithoutInfo: string;

  // Step 3
  q3: string;
  topicsLoading: string;
  topicsEmpty: string;
  q3Happened: string;
  wh: {
    error: string;
    nothing: string;
    slow: string;
    wrong: string;
    confused: string;
    access: string;
    other: string;
  };
  commentLabel: string;
  commentPlaceholder: string;
  writeOwn: string;
  writeOwnPlaceholder: string;

  // Step 3 — expected / desired chips
  qExpected: string;
  expectedChipLabels: [string, string, string, string, string, string];
  qDesired: string;
  desiredChipLabels: [string, string, string, string, string, string];

  // User story preview
  storyTitle: string;
  storyTrying: string;
  storyBut: string;
  storyTopicPlaceholder: string;
  storyWhatPlaceholder: string;
  storyExpected: string;
  storyDesired: string;

  // Submit / states
  submitting: string;
  submitButton: string;
  submitError: string;
  success: string;

  // Persona modal
  personaTitle: string;
  personaSubtitle: string;
  personaName: string;
  personaNamePlaceholder: string;
  personaRole: string;
  personaRolePlaceholder: string;
  personaOrg: string;
  personaOrgPlaceholder: string;
  personaFamiliarity: string;
  personaFamOpts: [string, string, string];
  personaExperience: string;
  personaExperiencePlaceholder: string;
  personaComfort: string;
  personaComfortOpts: [string, string, string];
  personaSubmit: string;
}

const en: Translations = {
  selectReady: "✂️ Click and drag to select the problem area",
  selectWaiting: "Getting ready...",
  back: "‹ Back",

  q1: "How are you feeling about this?",
  emojiLabels: ["Very unhappy", "Unhappy", "Neutral", "Happy", "Very happy"],

  q2: "What kind of feedback is this?",
  typeLabels: { bug: "Bug", feature: "Idea", question: "Question" },
  submitWithoutInfo: "Submit without more info",

  q3: "What were you trying to do?",
  topicsLoading: "✨ Analyzing your screenshot...",
  topicsEmpty: "Describe what you were doing:",
  q3Happened: "What happened?",
  wh: {
    error:    "Error appeared",
    nothing:  "Nothing happened",
    slow:     "Too slow",
    wrong:    "Wrong result",
    confused: "Got confused",
    access:   "Couldn't access",
    other:    "Something else",
  },
  commentLabel: "Any details to add?",
  commentPlaceholder: "Tell us more... (optional)",
  writeOwn: "✏️ Write your own",
  writeOwnPlaceholder: "Describe what you were doing...",

  qExpected: "What did you expect?",
  expectedChipLabels: ["It should have worked", "Data to be saved", "Screen to update", "A confirmation", "A clear error", "No change needed"],
  qDesired: "What would you like?",
  desiredChipLabels: ["Fix the issue", "Better messages", "Faster response", "Easier navigation", "New feature", "Better guidance"],

  storyTitle: "Your story",
  storyTrying: "I was trying to",
  storyBut: "but",
  storyTopicPlaceholder: "what were you doing?",
  storyWhatPlaceholder: "what happened?",
  storyExpected: "I expected",
  storyDesired: "I would like",

  submitting: "Sending...",
  submitButton: "Submit Feedback",
  submitError: "Submission failed. Please try again.",
  success: "Thank you! Feedback submitted.",

  personaTitle: "Tell us about yourself",
  personaSubtitle: "This helps us understand who is giving feedback. Collected once per session.",
  personaName: "Your name",
  personaNamePlaceholder: "e.g. María García",
  personaRole: "Your role",
  personaRolePlaceholder: "e.g. Mayor, Firefighter, Urban Planner",
  personaOrg: "Your organisation",
  personaOrgPlaceholder: "e.g. City of Vigo",
  personaFamiliarity: "How familiar are you with this app?",
  personaFamOpts: ["First time", "Used it before", "Regular user"],
  personaExperience: "Years of professional experience (optional)",
  personaExperiencePlaceholder: "e.g. 10",
  personaComfort: "Digital comfort level (optional)",
  personaComfortOpts: ["Basic", "Comfortable", "Advanced"],
  personaSubmit: "Start giving feedback",
};

const es: Translations = {
  selectReady: "✂️ Haz clic y arrastra para seleccionar el área con el problema",
  selectWaiting: "Preparando...",
  back: "‹ Volver",

  q1: "¿Cómo te sientes al respecto?",
  emojiLabels: ["Muy insatisfecho", "Insatisfecho", "Neutral", "Satisfecho", "Muy satisfecho"],

  q2: "¿Qué tipo de comentario es este?",
  typeLabels: { bug: "Error", feature: "Idea", question: "Pregunta" },
  submitWithoutInfo: "Enviar sin más información",

  q3: "¿Qué estabas intentando hacer?",
  topicsLoading: "✨ Analizando tu captura de pantalla...",
  topicsEmpty: "Describe qué estabas haciendo:",
  q3Happened: "¿Qué ocurrió?",
  wh: {
    error:    "Apareció un error",
    nothing:  "No pasó nada",
    slow:     "Demasiado lento",
    wrong:    "Resultado incorrecto",
    confused: "Me confundí",
    access:   "No pude acceder",
    other:    "Otra cosa",
  },
  commentLabel: "¿Algún detalle que añadir?",
  commentPlaceholder: "Cuéntanos más... (opcional)",
  writeOwn: "✏️ Escribir propio",
  writeOwnPlaceholder: "Describe qué estabas haciendo...",

  qExpected: "¿Qué esperabas?",
  expectedChipLabels: ["Que funcionara", "Que se guardara", "Que se actualizara", "Una confirmación", "Un error claro", "Sin cambios"],
  qDesired: "¿Qué te gustaría?",
  desiredChipLabels: ["Corregir el error", "Mejores mensajes", "Más rapidez", "Navegación más fácil", "Nueva función", "Mejor orientación"],

  storyTitle: "Tu historia",
  storyTrying: "Estaba intentando",
  storyBut: "pero",
  storyTopicPlaceholder: "¿qué estabas haciendo?",
  storyWhatPlaceholder: "¿qué ocurrió?",
  storyExpected: "Esperaba",
  storyDesired: "Me gustaría",

  submitting: "Enviando...",
  submitButton: "Enviar comentario",
  submitError: "Error al enviar. Por favor, inténtalo de nuevo.",
  success: "¡Gracias! Comentario enviado.",

  personaTitle: "Cuéntanos sobre ti",
  personaSubtitle: "Esto nos ayuda a entender quién da el feedback. Se recoge una vez por sesión.",
  personaName: "Tu nombre",
  personaNamePlaceholder: "p. ej. María García",
  personaRole: "Tu rol",
  personaRolePlaceholder: "p. ej. Alcaldesa, Bombero, Urbanista",
  personaOrg: "Tu organización",
  personaOrgPlaceholder: "p. ej. Ayuntamiento de Vigo",
  personaFamiliarity: "¿Qué tan familiarizado/a estás con esta app?",
  personaFamOpts: ["Primera vez", "Ya la he usado", "Usuario habitual"],
  personaExperience: "Años de experiencia profesional (opcional)",
  personaExperiencePlaceholder: "p. ej. 10",
  personaComfort: "Nivel de comodidad digital (opcional)",
  personaComfortOpts: ["Básico", "Cómodo", "Avanzado"],
  personaSubmit: "Empezar a dar feedback",
};

const gl: Translations = {
  selectReady: "✂️ Fai clic e arrastra para seleccionar a área co problema",
  selectWaiting: "Preparando...",
  back: "‹ Atrás",

  q1: "Como te sentes ao respecto?",
  emojiLabels: ["Moi insatisfeito", "Insatisfeito", "Neutral", "Satisfeito", "Moi satisfeito"],

  q2: "Que tipo de comentario é este?",
  typeLabels: { bug: "Erro", feature: "Idea", question: "Pregunta" },
  submitWithoutInfo: "Enviar sen máis información",

  q3: "Que estabas a tentar facer?",
  topicsLoading: "✨ Analizando a túa captura de pantalla...",
  topicsEmpty: "Describe o que estabas a facer:",
  q3Happened: "Que ocorreu?",
  wh: {
    error:    "Apareceu un erro",
    nothing:  "Non pasou nada",
    slow:     "Demasiado lento",
    wrong:    "Resultado incorrecto",
    confused: "Desorienteime",
    access:   "Non puiden acceder",
    other:    "Outra cousa",
  },
  commentLabel: "Algún detalle que engadir?",
  commentPlaceholder: "Cóntanos máis... (opcional)",
  writeOwn: "✏️ Escribir propio",
  writeOwnPlaceholder: "Describe o que estabas a facer...",

  qExpected: "Que esperabas?",
  expectedChipLabels: ["Que funcionara", "Que se gardara", "Que se actualizara", "Unha confirmación", "Un erro claro", "Sen cambios"],
  qDesired: "Que che gustaría?",
  desiredChipLabels: ["Corrixir o erro", "Mellores mensaxes", "Máis rapidez", "Navegación máis fácil", "Nova función", "Mellor orientación"],

  storyTitle: "A túa historia",
  storyTrying: "Estaba a tentar",
  storyBut: "pero",
  storyTopicPlaceholder: "que estabas a facer?",
  storyWhatPlaceholder: "que ocorreu?",
  storyExpected: "Esperaba",
  storyDesired: "Gustaríame",

  submitting: "Enviando...",
  submitButton: "Enviar comentario",
  submitError: "Erro ao enviar. Por favor, téntao de novo.",
  success: "Grazas! Comentario enviado.",

  personaTitle: "Fálanos sobre ti",
  personaSubtitle: "Isto axúdanos a entender quen dá o feedback. Recóllese unha vez por sesión.",
  personaName: "O teu nome",
  personaNamePlaceholder: "ex. María García",
  personaRole: "O teu rol",
  personaRolePlaceholder: "ex. Alcaldesa, Bombeiro, Urbanista",
  personaOrg: "A túa organización",
  personaOrgPlaceholder: "ex. Concello de Vigo",
  personaFamiliarity: "Canto coñeces esta app?",
  personaFamOpts: ["Primeira vez", "Xa a usei", "Usuaria habitual"],
  personaExperience: "Anos de experiencia profesional (opcional)",
  personaExperiencePlaceholder: "ex. 10",
  personaComfort: "Nivel de comodidade dixital (opcional)",
  personaComfortOpts: ["Básico", "Cómodo", "Avanzado"],
  personaSubmit: "Comezar a dar feedback",
};

const de: Translations = {
  selectReady: "✂️ Klicken und ziehen, um den Problembereich auszuwählen",
  selectWaiting: "Wird vorbereitet...",
  back: "‹ Zurück",

  q1: "Wie fühlst du dich damit?",
  emojiLabels: ["Sehr unzufrieden", "Unzufrieden", "Neutral", "Zufrieden", "Sehr zufrieden"],

  q2: "Was für Feedback ist das?",
  typeLabels: { bug: "Fehler", feature: "Idee", question: "Frage" },
  submitWithoutInfo: "Ohne weitere Infos senden",

  q3: "Was hast du versucht zu tun?",
  topicsLoading: "✨ Screenshot wird analysiert...",
  topicsEmpty: "Beschreibe, was du gemacht hast:",
  q3Happened: "Was ist passiert?",
  wh: {
    error:    "Fehler erschienen",
    nothing:  "Nichts passierte",
    slow:     "Zu langsam",
    wrong:    "Falsches Ergebnis",
    confused: "Verwirrt",
    access:   "Kein Zugriff",
    other:    "Etwas anderes",
  },
  commentLabel: "Möchtest du noch etwas ergänzen?",
  commentPlaceholder: "Erzähl uns mehr... (optional)",
  writeOwn: "✏️ Selbst schreiben",
  writeOwnPlaceholder: "Beschreibe, was du gemacht hast...",

  qExpected: "Was hast du erwartet?",
  expectedChipLabels: ["Dass es funktioniert", "Daten gespeichert", "Bildschirm aktualisiert", "Eine Bestätigung", "Klare Fehlermeldung", "Keine Änderung"],
  qDesired: "Was wünschst du dir?",
  desiredChipLabels: ["Fehler beheben", "Bessere Meldungen", "Schnellere Reaktion", "Einfachere Navigation", "Neue Funktion", "Bessere Anleitung"],

  storyTitle: "Deine Story",
  storyTrying: "Ich wollte",
  storyBut: "aber",
  storyTopicPlaceholder: "was wolltest du tun?",
  storyWhatPlaceholder: "was ist passiert?",
  storyExpected: "Ich erwartete",
  storyDesired: "Ich würde mir wünschen",

  submitting: "Wird gesendet...",
  submitButton: "Feedback senden",
  submitError: "Senden fehlgeschlagen. Bitte erneut versuchen.",
  success: "Danke! Feedback wurde gesendet.",

  personaTitle: "Erzähl uns von dir",
  personaSubtitle: "Das hilft uns zu verstehen, wer Feedback gibt. Wird einmal pro Sitzung erfasst.",
  personaName: "Dein Name",
  personaNamePlaceholder: "z. B. María García",
  personaRole: "Deine Rolle",
  personaRolePlaceholder: "z. B. Bürgermeisterin, Feuerwehrmann, Stadtplaner",
  personaOrg: "Deine Organisation",
  personaOrgPlaceholder: "z. B. Stadt Vigo",
  personaFamiliarity: "Wie vertraut bist du mit dieser App?",
  personaFamOpts: ["Erstes Mal", "Schon genutzt", "Regelmäßiger Nutzer"],
  personaExperience: "Jahre Berufserfahrung (optional)",
  personaExperiencePlaceholder: "z. B. 10",
  personaComfort: "Digitales Komfortniveau (optional)",
  personaComfortOpts: ["Grundlegend", "Routiniert", "Fortgeschritten"],
  personaSubmit: "Feedback starten",
};

export const translations: Record<Language, Translations> = { de, en, es, gl };
