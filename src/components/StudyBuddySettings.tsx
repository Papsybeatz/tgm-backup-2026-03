import { Link } from "react-router-dom";

export default function StudyBuddySettings() {
  return (
    <main className="studybuddy-settings">
      <Link to="/studybuddy" className="studybuddy-back-link">← Back to dashboard</Link>
      <span className="studybuddy-section-kicker">STUDYBUDDY</span>
      <h1>Study settings</h1>
      <p>Personalization controls will live here as the adaptive learning engine is connected.</p>
      <div className="studybuddy-settings-grid">
        <div className="studybuddy-panel"><h3>Learning preferences</h3><label>Preferred study style<select><option>Visual explanations</option><option>Practice first</option><option>Step-by-step lessons</option></select></label><label>Daily study goal<select><option>45 minutes</option><option>60 minutes</option><option>90 minutes</option></select></label></div>
        <div className="studybuddy-panel"><h3>Profile sources</h3><p>Connect your report card, syllabus, and school calendar to unlock a more precise plan.</p><button className="btn btn-primary">Manage documents</button></div>
      </div>
    </main>
  );
}
