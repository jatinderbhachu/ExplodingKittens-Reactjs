import React from "react";
import CreateLobby from "./CreateLobby";
import LobbyBrowser from "./LobbyBrowser";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Welcome from "./Welcome";
import NameForm from "./NameForm";
import Game from "./Game";
import AppContext from "./AppContext";
import Socket from "./Socket";

import "./App.css";



class Loading extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <div className="Loading"></div>;
  }
}

// FIXME: convert to react hook
class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      socket: null,
      socketReady: false,
      lobbyID: undefined,
      playerName: undefined,
      ID: undefined,
      isHost: false,
      inGame: false,
      currentTurn: undefined,
    };
    this.setPlayerName = this.setPlayerName.bind(this);
    this.websocketConnect = this.websocketConnect.bind(this);
    this.onCloseCallback = this.onCloseCallback.bind(this);
    this.onOpenCallback = this.onOpenCallback.bind(this);

  }

  componentDidMount() {
    const { socket } = this.state;
    if (!socket || socket.readyState === 0) {
      console.log("Connecting...");
      this.websocketConnect();
    }

  }

  onCloseCallback() {
    this.setState({socketReady: false});
  }

  onOpenCallback() {
    this.setState({socketReady: true});
  }

  websocketConnect() {

    Socket.addEventListener("set_id", (id) => {
      this.setState({ ID: id.detail });
    });

    document.addEventListener("socket_state_change", (state) => {
      if(state.detail === WebSocket.CLOSED){
        this.setState({socketReady: false});
      } else if(state.detail === WebSocket.OPEN) {
        this.setState({socketReady: true});
      }
    })

  }

  setPlayerName(name) {
    this.setState({ playerName: name });
  }

  render() {
    const { socketReady, playerName } = this.state;


    // Allow the socket to finish connecting before loading any components
    if (!socketReady) {
      return <Loading />;
    }

    if(false){
      return(
      <AppContext.Provider value={this.state}>
        <div className="App">
          <Game />
        </div>
      </AppContext.Provider>);
    }

    const askName = playerName ? null : (
      <NameForm setNameHandler={this.setPlayerName} />
    );


    return (
      <Router>
        <AppContext.Provider value={this.state}>
          <div className="App">
            {askName}
            {/* dont allow player to access anything unless their nickname is set */}
            {(playerName) && (
              <Switch>
                <Route exact path="/" component={Welcome} />
                <Route exact path="/createlobby" component={CreateLobby} />
                <Route exact path="/lobby/:id" component={CreateLobby} />
                <Route path="/browser" component={LobbyBrowser} />
                <Route exact path="/game" component={Game} />
              </Switch>
            )}
          </div>
        </AppContext.Provider>
      </Router>
    );
  }
}

export default App;
