import type { Habit } from "./habits";

export interface Exercise {
  name: string;
  amount: string;
  how: string;
}

export interface CoachTopic {
  key: string;
  title: string;
  keywords: string[];
  tips: string[];
  exercises?: Exercise[];
  /** Suggested question for the AI coach. */
  question: string;
}

export const COACH_TOPICS: CoachTopic[] = [
  {
    key: "sport",
    title: "Sport & Training",
    keywords: ["sport", "training", "workout", "fitness", "liegestütz", "kraft", "gym", "joggen", "laufen", "rennen", "yoga", "dehnen", "übung"],
    tips: [
      "Leg deine Sportsachen schon am Abend bereit – das senkt die Hürde am nächsten Tag.",
      "Lieber 10 Minuten jeden Tag als eine Stunde einmal im Monat.",
      "Wärm dich 3–5 Minuten auf, bevor es intensiv wird.",
      "Steigere dich pro Woche um höchstens 10 %, damit dein Körper mitkommt.",
    ],
    exercises: [
      { name: "Liegestütze", amount: "3 × 8–12", how: "Hände schulterbreit, Körper gerade wie ein Brett. Zu schwer? Auf den Knien starten." },
      { name: "Kniebeugen", amount: "3 × 15", how: "Füße hüftbreit, Po nach hinten, Knie über den Füßen, Rücken gerade." },
      { name: "Unterarmstütz (Plank)", amount: "3 × 30 Sek.", how: "Ellbogen unter den Schultern, Bauch fest, nicht ins Hohlkreuz fallen." },
      { name: "Ausfallschritte", amount: "3 × 10 pro Bein", how: "Großer Schritt nach vorn, hinteres Knie Richtung Boden, Oberkörper aufrecht." },
      { name: "Hampelmann", amount: "3 × 40 Sek.", how: "Zum Aufwärmen oder als Cardio zwischendurch – locker und rhythmisch." },
      { name: "Glute Bridge", amount: "3 × 15", how: "Rückenlage, Füße aufgestellt, Becken anheben bis Knie–Hüfte–Schulter eine Linie bilden." },
    ],
    question: "Stell mir ein 15-Minuten-Workout ohne Geräte für zuhause zusammen.",
  },
  {
    key: "steps",
    title: "Schritte & Bewegung",
    keywords: ["schritt", "gehen", "spazier", "wandern", "bewegung"],
    tips: [
      "Telefoniere im Gehen – so sammeln sich Schritte fast von selbst.",
      "Steig eine Haltestelle früher aus oder parke weiter weg.",
      "Nach dem Essen 10 Minuten spazieren hilft auch der Verdauung.",
      "Treppe statt Aufzug: kleine Entscheidung, große Wirkung über die Woche.",
    ],
    question: "Wie schaffe ich mehr Schritte, wenn ich viel am Schreibtisch sitze?",
  },
  {
    key: "water",
    title: "Trinken",
    keywords: ["wasser", "trinken", "glas", "gläser", "liter", "hydr"],
    tips: [
      "Starte den Tag mit einem großen Glas Wasser direkt nach dem Aufstehen.",
      "Stell dir eine Flasche sichtbar auf den Schreibtisch.",
      "Verknüpfe Trinken mit Routinen: ein Glas zu jeder Mahlzeit.",
      "Wasser schmeckt dir zu langweilig? Zitrone, Gurke oder Minze helfen.",
    ],
    question: "Gib mir Tricks, wie ich über den Tag verteilt genug trinke.",
  },
  {
    key: "screen",
    title: "Bildschirmzeit",
    keywords: ["social", "media", "handy", "bildschirm", "instagram", "tiktok", "youtube", "screen", "smartphone"],
    tips: [
      "Schieb die Apps vom Startbildschirm in einen Ordner auf Seite 2.",
      "Stell den Bildschirm auf Graustufen – das macht Scrollen deutlich weniger reizvoll.",
      "Handy beim Schlafen außerhalb des Schlafzimmers laden.",
      "Ersetze das Scrollen durch etwas Konkretes: ein Buch neben dem Bett, ein Spaziergang.",
    ],
    question: "Wie kann ich meine Social-Media-Zeit reduzieren, ohne dass es sich wie Verzicht anfühlt?",
  },
  {
    key: "learning",
    title: "Lernen",
    keywords: ["lernen", "lern", "sprache", "vokabel", "studium", "lesen", "kurs", "üben", "uni", "schule"],
    tips: [
      "Arbeite mit der Pomodoro-Methode: 25 Minuten Fokus, 5 Minuten Pause.",
      "Erkläre das Gelernte laut in eigenen Worten – das festigt es am besten.",
      "Wiederhole in wachsenden Abständen (nach 1, 3, 7 Tagen).",
      "Handy in einen anderen Raum, solange du lernst.",
    ],
    question: "Mach mir einen Lernplan für 30 Minuten am Tag, der wirklich hängen bleibt.",
  },
  {
    key: "reading",
    title: "Lesen",
    keywords: ["buch", "seite", "seiten", "roman"],
    tips: [
      "Lies jeden Abend 10 Seiten vor dem Schlafen statt aufs Handy zu schauen.",
      "Trag immer ein Buch oder eine E-Book-App für Wartezeiten bei dir.",
      "Ein Buch gefällt dir nicht? Abbrechen ist erlaubt.",
    ],
    question: "Wie schaffe ich es, regelmäßig zu lesen?",
  },
  {
    key: "mind",
    title: "Achtsamkeit & Schlaf",
    keywords: ["medit", "achtsam", "atem", "schlaf", "entspann", "journal", "tagebuch"],
    tips: [
      "Fang klein an: 2 Minuten bewusstes Atmen zählen schon.",
      "Box-Atmung: 4 Sek. ein, 4 halten, 4 aus, 4 halten – 5 Runden.",
      "Feste Uhrzeit hilft: z. B. direkt nach dem Zähneputzen.",
      "Eine Stunde vor dem Schlafen Bildschirme weglegen.",
    ],
    question: "Führe mich durch eine kurze Atemübung für mehr Ruhe.",
  },
];

export const GENERAL_TOPIC: CoachTopic = {
  key: "general",
  title: "Allgemein",
  keywords: [],
  tips: [
    "Mach es so klein, dass du nicht Nein sagen kannst – Steigern kommt später.",
    "Häng die neue Gewohnheit an eine bestehende: „Nach dem Kaffee mache ich …“.",
    "Ein verpasster Tag ist kein Problem – nur nicht zwei hintereinander.",
    "Belohne dich direkt danach, z. B. mit deinem Lieblingssong.",
  ],
  question: "Wie bleibe ich bei einer neuen Gewohnheit dran, wenn die Motivation nachlässt?",
};

export function topicForHabit(habit: Pick<Habit, "name" | "unit">): CoachTopic {
  const text = `${habit.name} ${habit.unit}`.toLowerCase();
  return COACH_TOPICS.find((t) => t.keywords.some((k) => text.includes(k))) ?? GENERAL_TOPIC;
}

/** A stable "tip of the day" that changes daily. */
export function tipOfTheDay(topic: CoachTopic, date: Date): string {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return topic.tips[dayNumber % topic.tips.length] ?? topic.tips[0] ?? "";
}
