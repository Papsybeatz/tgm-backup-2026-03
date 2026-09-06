import type { Flashcard } from "../types/Flashcard";

type FlashcardViewProps = {
  card?: Flashcard;
};

export default function FlashcardView({ card }: FlashcardViewProps) {
  return (
    <section aria-label="Flashcard">
      <h2>Flashcards</h2>
      <p>{card?.front ?? "Your flashcard will appear here."}</p>
    </section>
  );
}
