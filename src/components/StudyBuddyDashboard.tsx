import { useState } from "react";
import { Link } from "react-router-dom";

const timetable = [
  { time: "08:00", subject: "Chemistry", topic: "Electrochemistry", status: "Priority", tone: "gold" },
  { time: "10:30", subject: "Mathematics", topic: "Algebraic manipulation", status: "Up next", tone: "blue" },
  { time: "15:00", subject: "Physics", topic: "Mechanics practice", status: "Planned", tone: "purple" },
];

const contextItems = [
  { label: "Report card", detail: "Grades and strengths", complete: true },
  { label: "Syllabus", detail: "Topics and competencies", complete: true },
  { label: "School calendar", detail: "Exams and deadlines", complete: false },
];

export default function StudyBuddyDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [uploaded, setUploaded] = useState(false);

  return (
    <main className="studybuddy-shell">
      <aside className="studybuddy-sidebar">
        <div className="studybuddy-brand">
          <span className="studybuddy-brand-mark">S</span>
          <span>StudyBuddy</span>
        </div>
        <p className="studybuddy-sidebar-label">Your workspace</p>
        {["Overview", "Timetable", "Study sessions", "Documents", "NSMQ training"].map((item) => (
          <button
            className={`studybuddy-nav-item ${activeTab === item ? "is-active" : ""}`}
            key={item}
            onClick={() => setActiveTab(item)}
          >
            <span className="studybuddy-nav-dot" />
            {item}
          </button>
        ))}
        <div className="studybuddy-sidebar-footer">
          <Link to="/studybuddy/settings" className="studybuddy-nav-item">
            <span className="studybuddy-nav-dot" />
            Settings
          </Link>
          <div className="studybuddy-profile">
            <span className="studybuddy-avatar">AM</span>
            <span><strong>Alex Morgan</strong><small>Senior student</small></span>
          </div>
        </div>
      </aside>

      <section className="studybuddy-content">
        <header className="studybuddy-topbar">
          <div>
            <p className="studybuddy-eyebrow">Sunday, 6 September 2026</p>
            <h1>Good morning, Alex.</h1>
            <p className="studybuddy-subtitle">Your plan is ready. Small, focused steps add up.</p>
          </div>
          <div className="studybuddy-top-actions">
            <button className="studybuddy-icon-button" aria-label="Notifications">!</button>
            <button className="btn btn-primary" onClick={() => setActiveTab("Study sessions")}>Start a session</button>
          </div>
        </header>

        <div className="studybuddy-tabs">
          {["Overview", "Timetable", "Study sessions", "Documents", "NSMQ training"].map((item) => (
            <button key={item} className={activeTab === item ? "is-active" : ""} onClick={() => setActiveTab(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="studybuddy-hero">
          <div>
            <span className="studybuddy-pill">TODAY'S FOCUS</span>
            <h2>Build momentum in your weakest topics.</h2>
            <p>Your timetable has prioritized Electrochemistry before your midterm in 12 days.</p>
            <button className="btn btn-primary" onClick={() => setActiveTab("Study sessions")}>Continue learning</button>
          </div>
          <div className="studybuddy-countdown">
            <span>Midterms</span>
            <strong>12</strong>
            <small>days left</small>
          </div>
        </div>

        <div className="studybuddy-stat-grid">
          <div className="studybuddy-stat-card"><span>Weekly progress</span><strong>68%</strong><small className="is-positive">+12% this week</small></div>
          <div className="studybuddy-stat-card"><span>Topics mastered</span><strong>24<span className="muted">/36</span></strong><small>12 topics to revisit</small></div>
          <div className="studybuddy-stat-card"><span>Study streak</span><strong>7 days</strong><small className="is-positive">Best: 14 days</small></div>
          <div className="studybuddy-stat-card"><span>Next session</span><strong>08:00</strong><small>Chemistry · 45 min</small></div>
        </div>

        <div className="studybuddy-dashboard-grid">
          <section className="studybuddy-panel">
            <div className="studybuddy-panel-heading"><div><span className="studybuddy-section-kicker">PERSONALIZED PLAN</span><h3>Today's timetable</h3></div><button className="studybuddy-text-button" onClick={() => setActiveTab("Timetable")}>View full plan</button></div>
            <div className="studybuddy-timetable">
              {timetable.map((item) => <div className="studybuddy-time-row" key={item.time}><time>{item.time}</time><span className={`studybuddy-subject-icon ${item.tone}`} /> <div><strong>{item.subject}</strong><p>{item.topic}</p></div><span className={`studybuddy-status ${item.tone}`}>{item.status}</span></div>)}
            </div>
          </section>

          <section className="studybuddy-panel">
            <div className="studybuddy-panel-heading"><div><span className="studybuddy-section-kicker">ACADEMIC CONTEXT</span><h3>Complete your profile</h3></div><span className="studybuddy-progress-label">2 of 3</span></div>
            <div className="studybuddy-context-list">
              {contextItems.map((item) => <div className="studybuddy-context-row" key={item.label}><span className={`studybuddy-check ${item.complete ? "complete" : ""}`}>{item.complete ? "✓" : ""}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div>{!item.complete && <button className="studybuddy-upload-button" onClick={() => setUploaded(true)}>{uploaded ? "Added" : "Add"}</button>}</div>)}
            </div>
            <p className="studybuddy-context-note">Adding your calendar lets StudyBuddy plan around exams and deadlines.</p>
          </section>
        </div>

        <section className="studybuddy-nsmq-card">
          <div><span className="studybuddy-pill studybuddy-pill-dark">SCIENCE TEAM</span><h3>Train for the NSMQ</h3><p>Timed drills, high-difficulty questions, and team performance in one focused space.</p><button className="studybuddy-link-button" onClick={() => setActiveTab("NSMQ training")}>Enter training hub <span>→</span></button></div>
          <div className="studybuddy-nsmq-metric"><strong>82%</strong><span>team mastery</span><div className="studybuddy-progress"><i /></div><small>+8% this month</small></div>
          <div className="studybuddy-nsmq-metric"><strong>04:32</strong><span>average response</span><small>Top 20% this week</small></div>
        </section>
      </section>
    </main>
  );
}
