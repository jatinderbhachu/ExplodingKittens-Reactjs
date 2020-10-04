import React from "react";
import { useHistory } from "react-router";

import "./styles/Welcome.css";

function Welcome(props) {
  const history = useHistory();

  function handleLobbyBrowserSubmit(e) {
    e.preventDefault();

    history.push("/browser");
  }



  function handleCreateLobbySubmit(e) {
    e.preventDefault();

    history.push("/createLobby");
  }

  return (
    <>
    <header className="AppHeader"><h1>Exploding Kittens</h1></header>
    <div className="Welcome-Container">
      <div className="BrowseButtons">
        <button type="submit" onClick={(e) => handleLobbyBrowserSubmit(e)}>Browse Lobbies</button>
        <button type="submit" onClick={(e) => handleCreateLobbySubmit(e)}>Create Custom Lobby</button>
      </div>
      <div className="WelcomeInfo">
        <h3>About</h3>
        <p>This is a clone of the Exploding kittens game, but now you can play it in your browser!</p>
      </div>
    </div>
    </>
  );

}


export default Welcome;
