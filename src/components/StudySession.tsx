import type { StudySessionContext } from "../types/StudySessionContext";

type StudySessionProps = {
  context?: StudySessionContext;
};

export default function StudySession({ context }: StudySessionProps) {
  return (
    <section aria-label="Study session">
      <h2>Study session</h2>
      <p>{context?.topic ?? "Choose a topic to begin."}</p>
    </section>
  );
}
