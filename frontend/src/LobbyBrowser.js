import React, { useState, useEffect } from "react";
import {useHistory} from "react-router";
import Socket from "./Socket";

import "./LobbyBrowser.css";

function LobbyBrowser(props) {
  const [lobbies, setLobbies] = useState([]);
  const history = useHistory();

  function updateLobbyList(e) {
    const data = e.detail;

    setLobbies(data.lobbies);

  }

  useEffect( () => {
    Socket.addEventListener("update_lobby_list", updateLobbyList);

    if(lobbies.length < 1){
      refreshList();
    }

    return function cleanup() {
      Socket.removeEventListener("update_lobby_list", updateLobbyList);

    }
  }, []);

  function joinLobby(lobbyID) {
    history.push("/lobby/"+lobbyID);
  }

  function refreshList() {
    Socket.send("get_lobby_list", {});
  }

  return (
    <>
    <header className="AppHeader"><h1>Exploding Kittens</h1></header>
    <div className="LobbyBrowser LobbyItem">
      <div className="Back">
        <button onClick={() => history.goBack()}>Back</button>
      </div>
      <span>
        Lobby browser
        <button onClick={() => refreshList()}>Refresh list</button>
      </span>

      <table>
        <thead>
          <tr>
            <td>Lobby name</td>
            <td>Players</td>
            <td>Game status</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {lobbies.map((lobby, index) => (
            <tr key={index}>
              <td>{lobby.name}</td>
              <td>{lobby.players}</td>
              <td>{lobby.state}</td>
              <td>
                {lobby.state === "IN_LOBBY" && (
                  <button onClick={() => joinLobby(lobby.lobbyID)}>
                    Join
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );

}

export default LobbyBrowser;
