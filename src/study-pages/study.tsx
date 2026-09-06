import FlashcardView from "../components/FlashcardView";
import QuizView from "../components/QuizView";
import UploadZone from "../components/UploadZone";

export default function StudyPage() {
  return (
    <main>
      <h1>Study</h1>
      <UploadZone />
      <FlashcardView />
      <QuizView />
    </main>
  );
}
