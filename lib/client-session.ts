export function clearLocalSquadSession() {
  if (typeof window === "undefined") return;

  const currentTeamName = localStorage.getItem("aimurdle_team_name");
  localStorage.removeItem("aimurdle_team_name");
  localStorage.removeItem("aimurdle_current_token");
  localStorage.removeItem("aimurdle_squad_badge");
  localStorage.removeItem("aimurdle_case_id");
  if (currentTeamName) {
    localStorage.removeItem(`aimurdle_team_token_${currentTeamName}`);
  }

  document.cookie = "aimurdle_squad_session=; path=/; max-age=0; samesite=lax";
}
