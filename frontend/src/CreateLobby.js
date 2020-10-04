import React, { useContext, useState, useEffect, useRef} from "react";
import { useHistory, useParams } from "react-router";
import AppContext from "./AppContext";
import "./styles/Lobby.css";
import Socket from "./Socket";

function Player(props) {
  const { player, uid } = props;
  return (
    <div className="LobbyPlayer" id={player.id}>
      <div className="PlayerName">{player.name}</div>
      {(uid !== player.id && props.isHost) && <button className="KickButton" onClick={props.handleKick}>X</button>}
    </div>
  );
}

function CreateLobby(props) {
  const [players, setPlayers] = useState([]);
  const context = useContext(AppContext);
  const history = useHistory();
  const { id } = useParams();
  const inviteLinkRef = useRef();


  function updateLobby(e) {
    let data = e.detail;
    context.lobbyID = data.settings.lobbyID;

    for(let player of data.players){
      if(player.id === context.ID){
        context.isHost = player.isHost;
      }
    }

    setPlayers(data.players);
  }

  function startGame(e) {
    const data = e.detail;
    context.inGame = true;
    context.currentTurn = data.currentTurn;
    history.push("/game");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const settings = e.target;
    //const Socket = this.context.socket;
    //if (!settings["lobbyName"].value.match(/^[0-9a-zA-Z]+$/)) {
      //alert("Lobby name must only contain letters and numbers");
    //}
    // trim and send lobby settings to server

    Socket.send(
      "try_start_game", {
        settings: { name: settings["lobbyName"].value },
        lobbyID: context.lobbyID,
      }
    );
  }

  function handleKick(e) {
    const id = e.target.parentElement.id;

    if(context.isHost) {
      Socket.send("kick_player", {lobbyID: context.lobbyID, playerID: id});
    }

  }

  // When server acknowledges the kick, and tells this client to leave
  function kick() {
    Socket.send("leave_lobby", {lobbyID: context.lobbyID});
    context.lobbyID = undefined;
    context.isHost = false;
    history.goBack();
  }

  useEffect(() => {
    Socket.addEventListener("update_lobby", updateLobby);
    Socket.addEventListener("start_game", startGame);

    Socket.addEventListener("kick", kick);


    if(id === undefined){
      console.log("Creating lobby");
      context.isHost = true;
      Socket.send(
        "join_lobby", { playerName: context.playerName }
      );
    } else {
      console.log("Joining lobby");
      context.isHost = false;
      Socket.send(
        "join_lobby", { 
          playerName: context.playerName, 
          lobbyID: id
        }
      );
    }

    console.log("ID: ", id);

    return function cleanup(){
      Socket.removeEventListener("update_lobby", updateLobby);
      Socket.removeEventListener("start_game", startGame);
      Socket.removeEventListener("kick", kick);
    }
  }, []);

  function copyInviteLink() {
    let range = document.createRange();
    range.selectNode(inviteLinkRef.current);
    window.getSelection().removeAllRanges(); // clear current selection
    window.getSelection().addRange(range); // to select text
    document.execCommand("copy");
    window.getSelection().removeAllRanges();// to deselect
  }

  function handleGoBack() {
    Socket.send("leave_lobby", {lobbyID: context.lobbyID});
    context.lobbyID = undefined;
    if(history.length <= 2){
      history.replace("/");
    } else {
      history.goBack();
    }

  }

  const { isHost, lobbyID } = context;
  let canStart = true;


  return(
    <>
    <header className="AppHeader"><h1>Exploding Kittens</h1></header>
    <div className="CreateLobby-Container">
      <button onClick={() => handleGoBack()}>{"< Back"}</button>
      <h1>
        Create Custom Lobby
      </h1>
      <div className="CreateLobby">
      <form onSubmit={(e) => handleSubmit(e)}>
        <h3>Lobby Settings</h3>

        <div className="row">
        <div className="col-25">
          <label htmlFor="lobbyName">Lobby Name</label>
        </div>
            <div className="col-75">
          <input
            disabled={!isHost}
            type="text"
            name="lobbyName"
            id="lobbyName"
          />
            </div>
        </div>

        <input
          disabled={!canStart || !isHost || (players.length < 2)}
          type="submit"
          value="Start Game"
        />
        <br/>
        {!canStart && <span>All players must be ready</span>}
      </form>
      <div className="CreateLobby-Player-Container">
        <h3>Players</h3>
        <div className="CreateLobby-Player">
        {players.map((player) => (
          <Player
            key={player.id}
            player={player}
            uid={context.ID}
            handleKick={handleKick}
            isHost={isHost}
          />
        ))}
        </div>
      </div>
    </div>
    {isHost && (
      <div className="Invite">
        Invite Link: (Click to copy)
        <div onClick={() => copyInviteLink()} ref={inviteLinkRef}>{window.location.origin + "/lobby/" + lobbyID}</div>
      </div>
    )}
    </div>
    </>
  );

}

export default CreateLobby;
