/*
 * Author: Jatinder Bhachu
 *
 * TODO: REFACTOR CODE
 *
 * GAME SETUP
 *  - each player starts with 7 random cards and 1 defuse card
 *  - draw pile has (num players) - 1 exploding kitten cards
 *  - shuffle deck, draw pile is face down, discard pile is empty
 *
 * GAME LOOP
 *  - player either plays a card, or doesnt
 *      - ends turn by drawing a card
 *  - can play as many cards as you want, as long as you end the turn by drawing a card
 *  - if you draw a exploding kitten, use defuse or you explode
 *
 * 56 cards
 *
 * CARDS
 *  - exploding: 4
 *      kills player when drawn, unless a defuse is used
 *  - defuse: 6
 *      used to defuse a exploding kitten
 *  - attack: 4
 *      playing this card allows you to skip drawing a card
 *      forces next player to take 2 turns in a row
 *      this stacks, an attacked player can play an attack card to
 *      force the next player to take 4 turns.
 *  - favor: 4
 *      force another player to give you a card of their choice
 *  - NOPE: 5
 *      deny any action exception exploding or defuse, can nope a nope
 *  - shuffle: 4
 *      shuffle the deck
 *  - skip: 4
 *      ends your turn, allows you to not draw, can be used when attacked
 *      but will only consume one of the 2 turns
 *  - see the future: 5
 *      allows the player to see the next 3 cards on the deck
 *  - cat cards: 4 of each, 5 unique cats, 20 cat cards total
 *      playing a combination of these cards has special effects
 *      2 matching cards allows you to steal any card from another player,
 *      but you cannot see which card
 *
 *
 * */

const ws = require("ws");

const express = require("express");
const { v4: uuid } = require("uuid");
const Lobby = require("./Lobby");

function formatMsg(type, data) {
  return JSON.stringify({ type, data });
}

const app = express();

app.use(express.static("frontend/build"));

app.get("/", (req, res) => {
  // res.sendFile(__dirname + "/client/index.html");
  res.sendFile(__dirname + "/frontend/build/index.html");
});

app.get("/*", (req, res) => {
  // res.sendFile(__dirname + "/client/index.html");
  res.sendFile(__dirname + "/frontend/build/index.html");
});

app.get("/lobby/:id", (req, res) => {
  // res.sendFile(__dirname + "/client/index.html");
  res.sendFile(__dirname + "/frontend/build/index.html");
});

const PORT = process.env.PORT || 8080;
const server = new ws.Server({ server: app.listen(PORT) });
console.log(`[INFO] Server running on http://localhost:${PORT}`);

const lobbies = new Map();

function getLobbyList(){
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

server.on("connection", (socket) => {
  socket.id = uuid();
  console.log(`[INFO] ${socket.id} has connected`);
  socket.send(JSON.stringify({ type: "set_id", data: socket.id }));

  socket.on("message", (raw) => {
    const msg = JSON.parse(raw);
    console.log(`${socket.id} [MSG] ${raw}`);

    let lobby = undefined;
    let currentPlayer = undefined;
    let lobbyPlayers = [];
    switch (msg.type) {
      case "get_game_state":
        lobby = lobbies.get(msg.data.lobbyID);
        //lobby.updateGameState(socket);
        let gameState = lobby.getGameState(socket);
        socket.send(formatMsg("update_game_state", gameState));

        break;
      /* Client attempts to join a lobby */
      case "join_lobby":
        let lobbyCode;
        if (msg.data.inviteCode) {
          // call join lobby
          if (!lobbies.get(msg.data.inviteCode)) break;

          let isHost = false;
          if(lobbies.get(msg.data.inviteCode).gameState.players.size < 1){
            isHost = true;
          }

          lobbyCode = msg.data.inviteCode;
          lobbies.get(msg.data.inviteCode).addPlayer(
            socket,
            msg.data.playerName,
            isHost
          );
          console.log(`[INFO] joining lobby ${lobbyCode}`);
        } else {
          lobby = new Lobby();
          lobby.addPlayer(socket, msg.data.playerName, true);
          lobby.name = `${msg.data.playerName}'s Lobby`;
          lobbyCode = lobby.inviteCode;
          lobbies.set(lobby.inviteCode, lobby);
          console.log(`[INFO] creating lobby ${lobbyCode}`);
        }

        console.log("[INFO] updating lobby");
        for (let [id, player] of lobbies.get(lobbyCode).gameState.players.entries()) {
          lobbyPlayers.push({
            id: player.socket.id,
            name: player.name,
            isHost: player.isHost,
            isReady: player.isReady
          });
        }

        lobbies.get(lobbyCode).emit(
          formatMsg("update_lobby", {
            players: lobbyPlayers,
            settings: { inviteCode: lobbyCode },
          })
        );

        break;
      case "get_lobby_list":
        socket.send(formatMsg("update_lobby_list", {lobbies: getLobbyList()}));
        break;
      case "post_game_cleanup":
        // delete the lobby 
        lobbies.delete(msg.data.lobbyID);

        break;
      case "kick_player":
        lobby = lobbies.get(msg.data.lobbyID);
        if(lobby.gameState.players.get(socket.id).isHost){
          let kickedPlayer = lobby.gameState.players.get(msg.data.playerID);
          kickedPlayer.socket.send(formatMsg("kick", {}));
          lobby.gameState.players.delete(msg.data.playerID);
        }


        console.log("[INFO] updating lobby");
        lobbyPlayers = [];
        for (let [id, player] of lobbies.get(msg.data.lobbyID).gameState.players.entries()) {
          lobbyPlayers.push({
            id: player.socket.id,
            name: player.name,
            isHost: player.isHost,
            isReady: player.isReady
          });
        }

        lobby.emit(
          formatMsg("update_lobby", {
            players: lobbyPlayers,
            settings: { inviteCode: msg.data.lobbyID },
          }
        ));
        break;
      // when a client leaves the lobby
      case "leave_lobby":
        lobby = lobbies.get(msg.data.lobbyID);
        // delete the player
        lobby.gameState.players.delete(socket.id);
        // if the lobby is empty, delete the lobby to preserve space
        if(lobby.gameState.players.size < 1) {
          lobbies.delete(msg.data.lobbyID);
        }
        break;
      /* Lobby host attempts to start the game */
      case "try_start_game":
        console.log("[INFO] try_start_game");
        lobby = lobbies.get(msg.data.lobbyCode);
        // FIXME: loop through players and check if they are all ready
        // set lobby settings
        // change game state to IN_PROGRESS
        // emit start game event

        if (lobby.gameState.players.size > 1) {
          lobby.setupGame();
        }
        break;
      case "get_opponents":
        lobbies.get(msg.data.lobbyID).updateOpponents(socket);
        break;
      case "get_table":
        lobbies.get(msg.data.lobbyID).updateTable(socket);
        break;
      case "get_player":
        lobbies.get(msg.data.lobbyID).updatePlayer(socket);
        break;
      case "get_turn":
        lobbies.get(msg.data.lobbyID).updateTurn();
        break;

      case "play_cards":
        lobby = lobbies.get(msg.data.lobbyID);
        // only play turn if current player is allowed to
        if(lobby.gameState.currentTurn === socket.id || msg.data.cards[0] === "nope"){
          lobby.playCards(socket, msg.data.cards);
        }

        break;
      case "end_turn":
        lobby = lobbies.get(msg.data.lobbyID);
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
            lobby.updateTurn();
          }


          lobby.updateGameState();
        } else {

          lobby.nextTurn();
          lobby.updateTurn();

          lobby.updateGameState();
        }
        break;
      case "get_favor_from":
        lobby = lobbies.get(msg.data.lobbyID);
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
        lobby = lobbies.get(msg.data.lobbyID);
        //lobby.updatePrevGameState();

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

        //lobby.emit(formatMsg("update_game_state", {favorTarget: undefined}));

        // give the card to the person who used favor
        lobby.addPlayerCard(msg.data.to, msg.data.card);
        //lobby.gameState.players.get(msg.data.to).cards.push(msg.data.card);

        lobby.updateGameState();

        // update all players
        //for(let [id, player] of lobby.gameState.players.entries()){
          //lobby.updatePlayer(player.socket);
          //lobby.updateOpponents(player.socket);
        //}
        break;
      case "steal_card":
        lobby = lobbies.get(msg.data.lobbyID);

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
        lobby = lobbies.get(msg.data.lobbyID);
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
          lobby.updateTurn();

          lobby.updateGameState();
        }
        break;
      default:
        break;
    }
  });

  socket.onclose = () => {
    console.log(`[INFO] ${socket.id} has disconnected`);

    // TODO: add a lobby id property to each socket connection
    // makes it easier to identify the lobby they are in
    for (let lobby of lobbies.values()) {
      if(lobby.gameState.players.has(socket.id)){
        lobby.gameState.players.delete(socket.id);

        console.log("[INFO] updating lobby");
        let lobbyPlayers = [];
        for (let [id, player] of lobby.gameState.players.entries()) {
          lobbyPlayers.push({
            id: player.socket.id,
            name: player.name,
            isHost: player.isHost,
            isReady: player.isReady
          });
        }

        lobby.emit(
          formatMsg("update_lobby", {
            players: lobbyPlayers,
            settings: { inviteCode: lobbyID},
          })
        );

        // if lobby is empty, delete it
        if(lobby.players.size === 0){
          lobbies.delete(lobby.inviteCode);
        }
      }
    }
  };
});

function updateLobby(lobby) {
  emitToLobby(lobby);
}
