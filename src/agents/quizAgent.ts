import type { Quiz } from "../types/Quiz";

export class QuizAgent {
  generateQuiz(sourceText: string, questionCount = 5): Quiz {
    void sourceText;
    void questionCount;
    throw new Error("Not implemented");
  }

  scoreQuiz(quizId: string, answers: string[]): number {
    void quizId;
    void answers;
    throw new Error("Not implemented");
  }

  explainAnswer(questionId: string, selectedAnswer: string): string {
    void questionId;
    void selectedAnswer;
    throw new Error("Not implemented");
  }
}
