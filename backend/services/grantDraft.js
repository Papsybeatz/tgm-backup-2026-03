function generateGrantDraft(story) {
  const cleanStory = String(story || '').trim();
  const focus = cleanStory || 'your program, the community it serves, and the funding need';

  return `Grant Proposal First Draft

Executive Summary
TGM prepared this first draft from your story: ${focus}

Statement of Need
The project addresses a clear community need and gives funders a practical way to support measurable progress. The strongest version of this section should include local data, who is affected, and what changes if funding is secured.

Project Description
The proposed initiative will deliver direct support, organize the work into fundable activities, and create a path from investment to outcomes. The final proposal should name the core activities, timeline, partners, and delivery model.

Impact and Outcomes
Expected outcomes should include people served, capacity expanded, dollars unlocked, services delivered, or measurable community change. Add any existing proof points, testimonials, pilots, or partner commitments.

Funding Request
The funding request should connect each budget item to the impact it unlocks. Personnel, program delivery, outreach, evaluation, and administration should be framed as necessary infrastructure for success.

Closing
This project is positioned as a credible, funder-ready opportunity because it combines a clear need, a focused solution, and a practical implementation path.`;
}

module.exports = { generateGrantDraft };
