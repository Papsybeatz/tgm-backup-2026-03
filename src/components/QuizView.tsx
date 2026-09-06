import type { Quiz } from "../types/Quiz";

type QuizViewProps = {
  quiz?: Quiz;
};

export default function QuizView({ quiz }: QuizViewProps) {
  return (
    <section aria-label="Quiz">
      <h2>Quiz</h2>
      <p>{quiz?.title ?? "Your quiz will appear here."}</p>
    </section>
  );
}
