import { Link } from "react-router-dom";

const subjects = ["Biology", "Chemistry", "Physics", "Elective Math", "Core Math"];
const weakAreas = ["Physics Mechanics", "Organic Chemistry"];
const tests = [
  { subject: "Physics", date: "Feb 14", fullDate: "Feb 14, 2025" },
  { subject: "Chemistry", date: "Feb 19", fullDate: "Feb 19, 2025" },
];

export default function StudyBuddyDashboard() {
  return (
    <main className="studybuddy-original-shell">
      <aside className="studybuddy-original-sidebar">
        <div className="studybuddy-original-logo">
          <span className="studybuddy-original-mark">SB</span>
          <strong>StudyBuddy</strong>
          <small>Pope John SHS</small>
          <em>Student learning portal</em>
        </div>
        <nav className="studybuddy-original-nav" aria-label="StudyBuddy navigation">
          {[
            ["Dashboard", "/studybuddy"],
            ["Study MVP", "/studybuddy"],
            ["Learn", "/studybuddy"],
            ["Past Papers", "/studybuddy"],
            ["Progress", "/studybuddy"],
            ["Revision Plan", "/studybuddy"],
            ["Settings", "/studybuddy/settings"],
          ].map(([label, path], index) => (
            <Link className={index === 0 ? "is-active" : ""} key={label} to={path}>
              <span className="studybuddy-nav-icon">{["⌂", "✦", "▣", "▤", "◒", "▦", "⚙"][index]}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="studybuddy-original-user"><span>K</span><div><strong>Kwadwo Asare</strong><small>Science</small></div></div>
      </aside>

      <section className="studybuddy-original-main">
        <header className="studybuddy-original-header">
          <div><strong>Pope John Senior High School</strong><small>StudyBuddy Portal · Welcome back, <b>Kwadwo Asare</b></small></div>
          <div className="studybuddy-original-header-actions"><span>◷ 0 days</span><span className="studybuddy-difficulty">easy difficulty</span><Link to="/">Sign out</Link></div>
        </header>
        <div className="studybuddy-original-content">
          <section className="studybuddy-welcome">
            <div><p>Sunday, September 6</p><h1>Good morning, Kwadwo!</h1><span>I know Physics Mechanics has been tricky. Want to tackle it today?</span><div className="studybuddy-checkin"><b>Daily Check-In</b><span>How did your Physics test go today?</span></div></div>
            <div className="studybuddy-streak"><strong>◔</strong><b>0 days streak</b><small>Come back tomorrow to start your streak.</small></div>
          </section>
          <nav className="studybuddy-content-tabs"><button className="is-active">Overview</button><button>Subjects</button><button>Progress</button><button>Settings</button></nav>

          <div className="studybuddy-original-grid">
            <section className="studybuddy-original-card"><h2>✦ <span>Your Subjects</span></h2>{subjects.map((subject) => <div className="studybuddy-subject-row" key={subject}><span>◉</span><strong>{subject}</strong><small>Active</small></div>)}</section>
            <section className="studybuddy-original-card"><h2>◒ <span>Weak Areas</span></h2><p className="studybuddy-card-note">Recommended next steps are prioritized from your recent study signals.</p>{weakAreas.map((area) => <Link className="studybuddy-weak-row" to="/studybuddy" key={area}>◈ <b>{area}</b><span>→</span></Link>)}<p className="studybuddy-card-note">Based on your disliked subjects: <b>Physics</b></p></section>
            <section className="studybuddy-original-card"><h2>▦ <span>Upcoming Tests</span></h2>{tests.map((test) => <div className="studybuddy-test-row" key={test.subject}><div><b>{test.subject}</b><small>{test.fullDate}</small></div><strong>{test.date}</strong></div>)}</section>
            <section className="studybuddy-original-card"><h2>▣ <span>Continue Learning</span></h2><b>Review weak topics</b><p className="studybuddy-card-note">Focus on: Physics Mechanics, Organic Chemistry</p><small>How you'll learn:</small><p className="studybuddy-card-note">View diagrams and infographics · Watch video explanations · See illustrated examples</p><Link className="studybuddy-gold-link" to="/studybuddy">Resume session history →</Link></section>
          </div>

          <div className="studybuddy-original-lower-grid">
            <section className="studybuddy-original-card"><h2>♧ <span>Career Hints</span></h2><div className="studybuddy-careers"><b>Doctor</b><b>Engineer</b><b>Data Scientist</b></div></section>
            <Link className="studybuddy-upload-card" to="/studybuddy"><strong>▤ <span>Upload Past Paper</span></strong><small>Upload a PDF or image to extract questions and detect weak areas</small></Link>
          </div>

          <section className="studybuddy-revision-card"><div><h2>▦ <span>Revision Plan</span></h2><p>2 weak areas prioritized for today</p><p>0 topics completed — reinforcement scheduled next week</p><small>Plan adapts to your streak, difficulty &amp; quiz performance</small></div><Link to="/studybuddy">View Plan →</Link></section>

          <section className="studybuddy-upgrade-strip"><div><b>New: Academic Context</b><span>Connect your report card, syllabus, and school calendar for a more precise timetable.</span></div><Link to="/studybuddy/settings">Complete profile →</Link><div><b>NSMQ Training Hub</b><span>Timed drills and team mastery for science students.</span></div><Link to="/studybuddy">Enter hub →</Link></section>
        </div>
      </section>
    </main>
  );
}
