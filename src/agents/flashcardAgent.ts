import type { Flashcard } from "../types/Flashcard";

export class FlashcardAgent {
  generateFlashcards(sourceText: string): Flashcard[] {
    void sourceText;
    throw new Error("Not implemented");
  }

  scheduleNextReview(cardId: string, performance: number): Date {
    void cardId;
    void performance;
    throw new Error("Not implemented");
  }

  saveProgress(studentId: string, cardId: string, performance: number): void {
    void studentId;
    void cardId;
    void performance;
    throw new Error("Not implemented");
  }
}
