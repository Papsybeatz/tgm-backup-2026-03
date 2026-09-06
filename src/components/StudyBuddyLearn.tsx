import { Link } from "react-router-dom";

const lessons = [
  { subject: "Physics", topic: "Mechanics", detail: "Vectors, motion, and forces", progress: "Needs attention" },
  { subject: "Chemistry", topic: "Organic Chemistry", detail: "Functional groups and reactions", progress: "Continue" },
  { subject: "Biology", topic: "Cell Biology", detail: "Membranes, transport, and enzymes", progress: "Ready to review" },
];

export default function StudyBuddyLearn() {
  return (
    <main className="studybuddy-feature-page">
      <Link to="/studybuddy" className="studybuddy-back-link">← Back to dashboard</Link>
      <span className="studybuddy-section-kicker">LEARN</span>
      <h1>Choose a learning session</h1>
      <p className="studybuddy-feature-intro">Pick up where you left off or focus on the weak areas prioritized for you.</p>
      <div className="studybuddy-feature-grid">
        {lessons.map((lesson) => (
          <article className="studybuddy-feature-card" key={lesson.topic}>
            <span className="studybuddy-feature-subject">{lesson.subject}</span>
            <h2>{lesson.topic}</h2>
            <p>{lesson.detail}</p>
            <span className="studybuddy-feature-status">{lesson.progress}</span>
            <button className="btn btn-primary">Start lesson</button>
          </article>
        ))}
      </div>
    </main>
  );
}
