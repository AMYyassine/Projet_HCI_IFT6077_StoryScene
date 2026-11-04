import { newWorkspace } from "./model";
import type { Story, ArtKind } from "./model";
export const defaultMoods = [
  { id: "hope", name: "Hope", color: "#e9bd55" },
  { id: "joy", name: "Joy", color: "#e99675" },
  { id: "tension", name: "Tension", color: "#d6737a" },
  { id: "mystery", name: "Mystery", color: "#9b82bf" },
  { id: "sadness", name: "Sadness", color: "#7f9dbf" },
  { id: "calm", name: "Calm", color: "#82ae9f" },
];
const passages = [
  "After seven years away, Lea returned to the old family house. The windows were dark, but the jasmine still climbed the gate. She had come to collect her father’s belongings, and nothing more.",
  "Rose was waiting in the garden. She pressed a small brass key into Lea’s hand. “Your father wanted you to have what is upstairs,” she said, then turned back to her roses.",
  "The key opened a narrow door in the attic. Beneath a white sheet, Lea found a wooden chest. Inside lay a sealed envelope with her name written in her father’s careful handwriting.",
  "The letter began with an apology. Her father had hidden a friendship with Adam, the man Lea had blamed for their family’s silence. “He stayed when I asked everyone else to leave,” the final line read.",
  "Tucked inside the envelope was a photograph: her father and Adam standing beside the sea. On its back was the address of a café and a date, only three weeks before her father died.",
  "At her father’s desk, Lea wrote a short invitation to Adam. She asked him to meet at the café in the photograph. Before sending it, she crossed out an accusation and replaced it with a question.",
  "Adam arrived early and chose a table by the window. Lea placed the letter between their cups. “Why did nobody tell me?” she asked. Adam reached for the envelope, then let his hand fall.",
  "Adam explained that her father had been afraid to ask for forgiveness. Each week, they had met at this same table and rehearsed a conversation that never happened. Lea listened until the coffee grew cold.",
  "Back at the house, Lea found Rose beside the gate. She returned the key and embraced her. The house no longer felt like a question she had to answer. She would keep the letter, but leave the silence behind.",
  "On the morning train, Lea opened her notebook. She wrote Adam’s name beneath Rose’s and began another letter. Beyond the window, the town disappeared into a pale, hopeful sky.",
];
const titles = [
  "Coming home",
  "A small brass key",
  "The attic",
  "The forgotten letter",
  "A photograph",
  "An invitation",
  "Across the table",
  "What was left unsaid",
  "Leaving the silence",
  "A new beginning",
];
const actions = [
  "Lea returns to her family home.",
  "Rose gives Lea the attic key.",
  "Lea discovers a sealed envelope.",
  "Lea reads her father’s confession.",
  "A photograph reveals a meeting place.",
  "Lea invites Adam to the café.",
  "Lea confronts Adam with the letter.",
  "Adam shares her father’s hidden regret.",
  "Lea says goodbye to Rose.",
  "Lea writes a new letter on the train.",
];
const arts: ArtKind[] = [
  "house",
  "garden",
  "attic",
  "letter",
  "photo",
  "desk",
  "cafe",
  "confession",
  "farewell",
  "train",
];
const casts = [
  ["lea"],
  ["lea", "rose"],
  ["lea"],
  ["lea"],
  ["lea"],
  ["lea"],
  ["lea", "adam"],
  ["lea", "adam"],
  ["lea", "rose"],
  ["lea"],
];
const moods: Record<string, number>[] = [
  { sadness: 65, hope: 35 },
  { calm: 60, mystery: 40 },
  { mystery: 80, tension: 20 },
  { mystery: 50, sadness: 50 },
  { mystery: 70, hope: 30 },
  { tension: 60, hope: 40 },
  { tension: 50, mystery: 30, hope: 20 },
  { sadness: 65, hope: 35 },
  { calm: 60, sadness: 40 },
  { hope: 80, calm: 20 },
];
export function demoStory(): Story {
  return {
    title: "The Forgotten Letter",
    paragraphs: passages.map((text, i) => ({ id: `p${i + 1}`, text })),
    characters: [
      {
        id: "lea",
        name: "Lea",
        color: "#a58abc",
        role: "The daughter returning home",
      },
      {
        id: "adam",
        name: "Adam",
        color: "#849aa8",
        role: "An old friend of her father",
      },
      {
        id: "rose",
        name: "Rose",
        color: "#b4a776",
        role: "The keeper of the house",
      },
    ],
    acts: [
      { id: "a1", title: "The return" },
      { id: "a2", title: "The secret" },
      { id: "a3", title: "The truth" },
    ],
    scenes: titles.map((title, i) => ({
      id: `s${i + 1}`,
      actId: i < 3 ? "a1" : i < 7 ? "a2" : "a3",
      title,
      mainAction: actions[i],
      cast: casts[i].map((characterId, j) => ({
        characterId,
        action:
          characterId === "lea"
            ? actions[i]
            : characterId === "rose"
              ? "Waits and listens."
              : "Faces a difficult memory.",
        x: casts[i].length === 1 ? 48 : j === 0 ? 31 : 69,
      })),
      anchors: [{ paragraphId: `p${i + 1}`, quote: passages[i] }],
      events: [],
      mood: moods[i],
      art: arts[i],
      needsReview: false,
    })),
    links: [
      {
        id: "l1",
        source: "s2",
        target: "s3",
        type: "causes",
        reason: "The brass key allows Lea to open the attic.",
      },
      {
        id: "l2",
        source: "s3",
        target: "s4",
        type: "causes",
        reason: "The discovered envelope contains her father’s letter.",
      },
      {
        id: "l3",
        source: "s4",
        target: "s7",
        type: "prepares",
        reason:
          "Lea brings the letter and its unanswered question to the café.",
      },
      {
        id: "l4",
        source: "s5",
        target: "s6",
        type: "causes",
        reason: "The address on the photograph gives Lea a place to meet Adam.",
      },
      {
        id: "l5",
        source: "s6",
        target: "s7",
        type: "causes",
        reason: "Adam comes to the café because Lea invites him.",
      },
      {
        id: "l6",
        source: "s7",
        target: "s8",
        type: "causes",
        reason: "Lea’s question prompts Adam to explain the secret.",
      },
      {
        id: "l7",
        source: "s8",
        target: "s9",
        type: "prepares",
        reason:
          "Understanding her father’s regret helps Lea leave without resentment.",
      },
      {
        id: "l8",
        source: "s9",
        target: "s10",
        type: "prepares",
        reason:
          "Her farewell makes room for a new relationship with Adam and Rose.",
      },
    ],
    moods: defaultMoods.map((m) => ({ ...m })),
    moodPresets: [],
    positions: {},
  };
}
export const demoWorkspace = () => newWorkspace(demoStory());
