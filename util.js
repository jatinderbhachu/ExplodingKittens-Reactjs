function formatMsg(type, data) {
  return JSON.stringify({ type, data });
}

function getLobbyList(lobbies) {
  let formattedLobbies = [];
  for (let lobby of lobbies.values()) {
    formattedLobbies.push({
      name: lobby.name,
      lobbyID: lobby.lobbyID,
      players: lobby.gameState.players.size,
      state: lobby.state,
    });
  }
  return formattedLobbies;
}

module.exports = { formatMsg, getLobbyList };
