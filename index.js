/*
 * Author: Jatinder Bhachu
 *
 * TODO: REFACTOR CODE
 *
 * */

require('dotenv').config();

const ws = require("ws");
const express = require("express");
const app = express();
const https = require("https");
const http = require("http");
const url = require('url');
const { v4: uuid } = require("uuid");
const fs = require("fs");

const Lobby = require("./Lobby");
const { formatMsg, getLobbyList } = require("./util");

const PORT = process.env.PORT || 8080;


let server;

// if in production, create https server
if(process.env.NODE_ENV === "production") {
  let options = {
    cert: fs.readFileSync( __dirname + '/ssl/cert.pem'),
    key: fs.readFileSync(__dirname + '/ssl/key.pem'),
  };

  server = https.createServer(options, app);
  console.log(`[INFO] Server running on https://localhost:${PORT}`);

} else { // otherwise create http server for debugging
  server = http.createServer(app);
  console.log(`[INFO] Server running on http://localhost:${PORT}`);
}


app.use(express.static("frontend/build"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/frontend/build/index.html");
});

app.get("/*", (req, res) => {
  res.sendFile(__dirname + "/frontend/build/index.html");
});

server.listen(PORT);

// WebSocket server
const WSS = new ws.Server({ noServer: true});


const lobbies = new Map();

WSS.on("connection", (socket) => {
  socket.id = uuid();
  console.log(`[INFO] ${socket.id} has connected`);
  socket.send(JSON.stringify({ type: "set_id", data: socket.id }));

  socket.on("message", (raw) => {
    const msg = JSON.parse(raw);
    console.log(`${socket.id} [MSG] ${raw}`);

    let lobby;
    if(msg.data.lobbyID){
      lobby = lobbies.get(msg.data.lobbyID);
    }

    let currentPlayer = undefined;
    switch (msg.type) {
      case "get_game_state":
        //lobby.updateGameState(socket);
        let gameState = lobby.getGameState(socket.id);
        socket.send(formatMsg("update_game_state", gameState));

        break;
      /* Client attempts to join a lobby */
      case "join_lobby":
        let lobbyCode;
        // if an invite code is present, join lobby with said code, otherwise create a new lobby
        if (msg.data.lobbyID) {
          if(lobby.state !== "IN_LOBBY") break;

          let isHost = false;

          lobbyCode = msg.data.lobbyID;
          lobbies.get(msg.data.lobbyID).addPlayer(
            socket,
            msg.data.playerName,
            isHost
          );
          console.log(`[INFO] joining lobby ${lobbyCode}`);
        } else {
          lobby = new Lobby();
          lobby.addPlayer(socket, msg.data.playerName, true);
          lobby.name = `${msg.data.playerName}'s Lobby`;
          lobbyCode = lobby.lobbyID;
          lobbies.set(lobby.lobbyID, lobby);
          console.log(`[INFO] creating lobby ${lobbyCode}`);
        }

        lobby.updateLobby();

        break;
      case "get_lobby_list":
        socket.send(formatMsg("update_lobby_list", {lobbies: getLobbyList(lobbies)}));
        break;
      case "post_game_cleanup":
        // delete the lobby 
        lobbies.delete(msg.data.lobbyID);

        break;
      case "kick_player":
        if(lobby.gameState.players.get(socket.id).isHost){
          let kickedPlayer = lobby.gameState.players.get(msg.data.playerID);
          kickedPlayer.socket.send(formatMsg("kick", {}));
          lobby.gameState.players.delete(msg.data.playerID);
        }

        lobby.updateLobby();

        break;
      // when a client leaves the lobby
      case "leave_lobby":
        // delete the player
        lobby.gameState.players.delete(socket.id);
        // if the lobby is empty, delete the lobby
        if(lobby.gameState.players.size < 1) {
          lobbies.delete(msg.data.lobbyID);
        } else {
          // set the last player in lobby to be the new host
          if(lobby.gameState.players.size === 1){
            lobby.gameState.players.values().next().value.isHost = true;
          }
          lobby.updateLobby();
        }
        break;
      /* Lobby host attempts to start the game */
      case "try_start_game":
        console.log("[INFO] try_start_game");
        // FIXME: loop through players and check if they are all ready
        // set lobby settings
        // change game state to IN_PROGRESS
        // emit start game event

        if (lobby.gameState.players.size > 1) {
          lobby.setupGame();
        }
        break;
      case "play_cards":
        // only play turn if current player is allowed to
        if(lobby.gameState.currentTurn === socket.id || msg.data.cards[0] === "nope"){
          lobby.playCards(socket, msg.data.cards);
        }

        break;
      case "end_turn":
        if(lobby.gameState.players.get(socket.id).drewExploding)
          break;

        if(lobby.gameState.players.get(socket.id).awaitingFavor)
          break;

        // draws a card for the player who ended the turn
        let drawnCard = lobby.drawCard();

        currentPlayer = lobby.gameState.players.get(lobby.gameState.currentTurn);

        // TODO: maybe implement a 30 second timer that triggers when an exploding kitten is drawn 
        // player can use steal or favor to get a defuse if they do not have one already, otherwise 
        // they will lose
        if(drawnCard === "exploding"){

          lobby.addMoveHistoryItem(currentPlayer.name + " drew an EXPLODING KITTEN");
          //lobby.emit(formatMsg("drew_exploding", {who: socket.id}));
          let player = lobby.gameState.players.get(socket.id);
          let canDefuse = false;
          for(const card of player.cards){
            if(card === "defuse"){
              canDefuse = true;
              break;
            }
          }
          if(canDefuse){
            player.drewExploding = true;
            lobby.exploding = true;
          } else { 
            lobby.addMoveHistoryItem(currentPlayer.name + " couldn't defuse it in time lol rip");
            player.isDead = true;
            player.turnsLeft = 0;

            // remove the exploding kitten and put it back in the draw pile
            lobby.removePlayerCards(socket.id, "exploding");
            lobby.gameState.drawPile.splice(Math.random() * lobby.gameState.drawPile.length, 0,"exploding");

            lobby.deadPlayers++;

            lobby.nextTurn();
          }


          lobby.updateGameState();
        } else {

          lobby.nextTurn();

          lobby.updateGameState();
        }
        break;
      case "get_favor_from":
        //lobby.updatePrevGameState();
        const fromPlayer = lobby.gameState.players.get(msg.data.from);
        currentPlayer = lobby.gameState.players.get(lobby.gameState.currentTurn);
        lobby.addMoveHistoryItem(currentPlayer.name + " is asking " + fromPlayer.name + " for a favor");

        fromPlayer.favorTarget = socket.id;
        lobby.gameState.players.get(socket.id).askingFavor = false;
        lobby.gameState.players.get(socket.id).awaitingFavor = true;
        //fromPlayer.socket.send(formatMsg("select_favor_card", { toID: socket.id, toName: fromPlayer.name }));
        fromPlayer.socket.send(formatMsg("update_game_state", {favorTarget: socket.id}));
        lobby.updateMoveHistory();

        break;
      case "give_favor_card":
        // use associative array of players to avoid looping through everyone

        // remove the card from the person giving away card
        const favorTarget = lobby.gameState.players.get(socket.id);
        favorTarget.favorTarget = null;

        currentPlayer = lobby.gameState.players.get(lobby.gameState.currentTurn);
        lobby.addMoveHistoryItem(favorTarget.name + " gave " + currentPlayer.name + " a card");
        currentPlayer.awaitingFavor = false;
        // update prev game state so that card is not removed from player and they are also not being targeted
        lobby.updatePrevGameState();



        //favorTarget.cards.splice(favorTarget.cards.indexOf(msg.data.card), 1);
        lobby.removePlayerCards(favorTarget.socket.id, [msg.data.card]);

        // give the card to the person who used favor
        lobby.addPlayerCard(msg.data.to, msg.data.card);

        lobby.updateGameState();

        break;
      case "steal_card":
        currentPlayer = lobby.gameState.players.get(lobby.gameState.currentTurn);
        lobby.addMoveHistoryItem(currentPlayer.name + " just yoinked a card from " + lobby.gameState.players.get(msg.data.from).name);

        // select player who is getting stolen from, remove the selected card, update lobby

        lobby.gameState.players.get(socket.id).isStealing = false;
        lobby.updatePrevGameState();

        //let stolenCard = lobby.gameState.players.get(msg.data.from).cards.splice(msg.data.cardIndex, 1)[0];
        //lobby.gameState.players.get(socket.id).cards.push(stolenCard);
        let stolenCard = lobby.removePlayerCards(msg.data.from, [msg.data.cardIndex])[0];
        lobby.addPlayerCard(socket.id, stolenCard);

        lobby.updateGameState();

        break;
      case "set_exploding_pos":
        if(lobby.gameState.currentTurn === socket.id && lobby.exploding){
          let explodingPlayer = lobby.gameState.players.get(socket.id);
          console.log("inserting exploding kitten at index " + msg.data.index);
          let currentPlayer = lobby.gameState.players.get(lobby.gameState.currentTurn);
          lobby.addMoveHistoryItem(currentPlayer.name + " managed to defuse it in time, hiding the exploding kitten in a secret position in the draw pile ");

          //explodingPlayer.cards.splice(explodingPlayer.cards.indexOf("exploding"), 1);
          lobby.removePlayerCards(socket.id, ["exploding"]);

          lobby.gameState.drawPile.splice(msg.data.index+1, 0, "exploding");
          explodingPlayer.drewExploding = false;
          explodingPlayer.insertingExploding = false;
          lobby.exploding = false;
          lobby.nextTurn();

          lobby.updateGameState();
        }
        break;
      default:
        break;
    }
  });

  socket.onclose = () => {
    console.log(`[INFO] ${socket.id} has disconnected`);

    for (let lobby of lobbies.values()) {
      if(lobby.gameState.players.has(socket.id)){
        lobby.gameState.players.delete(socket.id);

        lobby.updateLobby();

        // if lobby is empty, delete it
        if(lobby.gameState.players.size === 0){
          lobbies.delete(lobby.lobbyID);
        }
      }
    }
  };
});


// handles websocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  console.log("upgrade", request.url);
  const pathname = url.parse(request.url).pathname;
  if (pathname === '/ws') {
    WSS.handleUpgrade(request, socket, head, function done(ws) {
      WSS.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

