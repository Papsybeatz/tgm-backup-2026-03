import { DocAgent } from "./docAgent";
import { FlashcardAgent } from "./flashcardAgent";
import { QuizAgent } from "./quizAgent";
import { StudyAgent } from "./studyAgent";

export class AgentRouter {
  constructor(
    private readonly studyAgent: StudyAgent,
    private readonly flashcardAgent: FlashcardAgent,
    private readonly quizAgent: QuizAgent,
    private readonly docAgent: DocAgent
  ) {}

  routeRequest(intent: string, payload: unknown): unknown {
    void intent;
    void payload;
    void this.studyAgent;
    void this.flashcardAgent;
    void this.quizAgent;
    void this.docAgent;
    throw new Error("Not implemented");
  }
}
