async function sendInviteEmail(email, inviterName, inviteLink) {
  // Stub: log to console
  console.log(`[EMAIL] Sent invite to ${email} from ${inviterName}. Link: ${inviteLink}`);
  // TODO: Integrate with real email provider
  return true;
}

module.exports = sendInviteEmail;
