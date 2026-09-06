import { Link } from "react-router-dom";

const days = [
  { day: "Mon", date: "7", sessions: ["Physics · Mechanics", "Chemistry · Electrochemistry"] },
  { day: "Tue", date: "8", sessions: ["Core Math · Algebra", "Biology · Cell Biology"] },
  { day: "Wed", date: "9", sessions: ["Physics · Past paper", "Revision cycle"] },
  { day: "Thu", date: "10", sessions: ["Chemistry · Organic Chemistry"] },
  { day: "Fri", date: "11", sessions: ["NSMQ timed drills", "Weekly review"] },
];

export default function StudyBuddyTimetable() {
  return (
    <main className="studybuddy-feature-page">
      <Link to="/studybuddy" className="studybuddy-back-link">← Back to dashboard</Link>
      <span className="studybuddy-section-kicker">PERSONALIZED PLAN</span>
      <h1>Your timetable</h1>
      <p className="studybuddy-feature-intro">A weekly plan built around your weak areas, available time, and upcoming exams.</p>
      <div className="studybuddy-timetable-banner"><strong>Midterms in 12 days</strong><span>Electrochemistry and Mechanics are prioritized this week.</span></div>
      <div className="studybuddy-week-grid">
        {days.map((day) => (
          <section className="studybuddy-day-card" key={day.day}>
            <header><span>{day.day}</span><strong>{day.date}</strong></header>
            {day.sessions.map((session) => <div className="studybuddy-day-session" key={session}><span />{session}</div>)}
          </section>
        ))}
      </div>
    </main>
  );
}
