function formatMsg(type, data) {
  return JSON.stringify({ type, data });
}

function getLobbyList(lobbies) {
  let formattedLobbies = [];
  for (let lobby of lobbies.values()) {
    formattedLobbies.push({
      name: lobby.name,
      lobbyID: lobby.inviteCode,
      players: lobby.gameState.players.size,
      state: lobby.state,
    });
  }
  return formattedLobbies;
}

function updateLobby(lobby) {
  console.log("[INFO] updating lobby");
  lobbyPlayers = [];
  for (let [id, player] of lobby.gameState.players.entries()) {
    lobbyPlayers.push({
      id: player.socket.id,
      name: player.name,
      isHost: player.isHost,
      isReady: player.isReady,
    });
  }

  lobby.emit(
    formatMsg("update_lobby", {
      players: lobbyPlayers,
      settings: { inviteCode: lobby.inviteCode },
    })
  );
}

module.exports = { formatMsg, getLobbyList, updateLobby };
