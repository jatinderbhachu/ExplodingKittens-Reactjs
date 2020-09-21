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

const PORT = 8080;
const server = new ws.Server({ server: app.listen(PORT) });
console.log(`[INFO] Server running on http://localhost:${PORT}`);

const lobbies = [];


let gameState = {
  players: new Map(),
  drawPile: [],
  discardPile: [],
  currentTurn: undefined,
  pCardChangedIndices: []
};

gameState.players.set("testID", {
    name: "rardboya1",
    id: "12308gdf",
    cards: ["cat1", "favor", "favor", "attack", "defuse", "attack"],
    isDead: false,
});


gameState.players.set("anothertestid", {
    name: "ezpz",
    id: "dfkjnoi34",
    cards: ["attack", "defuse", "attack"],
    isDead: false,
});

gameState.drawPile = ["cat1", "cat1", "draw", "defuse", "cat1", "cat1", "draw", "defuse", "cat1", "cat1", "draw", "defuse"];
gameState.discardPile = ["defuse", "cat1"];


function getGameState(socket) {
  let opponents = [];
  for(let player of gameState.players.values()){
    if(player.id !== socket.id){
      opponents.push({ name: player.name, id: player.id, cards: player.cards.length, isDead: player.isDead });
    }
  }
  let player = gameState.players.get(socket.id);
  return {
    opponents,
    drawPile: gameState.drawPile.length,
    discardPile: gameState.discardPile,
    playerCards: player.cards,
    drewExploding: false,
    insertingExploding: player.insertingExploding,
    currentTurn: gameState.currentTurn,
    turnsLeft: player.turnsLeft,
    askingFavor: player.askingFavor,
    stealingCard: player.stealingCard,
    insertingExploding: player.insertingExploding,
    favorTarget: player.favorTarget,
    pCardChangedIndices: player.pCardChangedIndices,
  };
}

function addPlayerCard(socketID, card, index){
  const player = gameState.players.get(socketID);
  if(!index){
    index = player.cards.length;
  }
  player.pCardChangedIndices.push(index);
  player.cards.splice(index, 0, card);
}

function removePlayerCards(socketID, cards){
  let removedCards = [];
  const player = gameState.players.get(socketID);
  if(Number.isInteger(cards[0])){
    // sort indices in ascending order
    player.pCardChangedIndices = cards;
  } else {
    // get the indices that got changed
    for(let card of cards){
      let index = player.cards.indexOf(card);
      if(index !== -1)
        player.pCardChangedIndices.push(index);
    }
  }

  player.pCardChangedIndices.sort((a, b) => a - b);

  // remove the cards
  for(let i = player.pCardChangedIndices.length - 1; i >= 0; i--){
    let index = player.pCardChangedIndices[i];
    if(index <= player.cards.length-1){
      let removedCard = player.cards.splice(player.pCardChangedIndices[i], 1)[0];
      console.log("removing ", removedCard);
      removedCards.push(removedCard);
    }
  }

  return removedCards;
}

server.on("connection", (socket) => {
  socket.id = uuid();

  gameState = {
    players: new Map(),
    drawPile: [],
    discardPile: [],
    currentTurn: undefined
  };

  gameState.players.set("testID", {
    name: "rardboya1",
    id: "12308gdf",
    cards: ["cat1", "favor", "favor", "attack", "defuse", "attack"],
    isDead: false,
    pCardChangedIndices: [],
  });

  gameState.players.set("anothertestid", {
    name: "ezpz",
    id: "dfkjnoi34",
    cards: ["attack", "defuse", "attack"],
    isDead: false,
    pCardChangedIndices: [],
  });

  gameState.players.set(socket.id, {
    name: "testboya",
    id: socket.id,
    cards: ["cat1", "defuse", "favor", "attack", "defuse", "attack", "attack", "defuse", "attack"],
    isDead: false,
    pCardChangedIndices: [],
  });
  gameState.drawPile = ["cat1", "cat1", "attack", "defuse", "cat1", "cat1", "attack", "defuse", "cat1", "cat1", "attack", "defuse"];
  gameState.discardPile = ["defuse", "cat1"];

  socket.send(JSON.stringify({ type: "set_id", data: socket.id }));

  console.log(`[INFO] ${socket.id} has connected`);

  socket.on("message", (raw) => {
    const msg = JSON.parse(raw);
    console.log(`[MSG] ${raw}`);

    let lobby = undefined;
    switch (msg.type) {
      case "test_animation":

        let player = gameState.players.get(socket.id);
        //let cardsToRemove = ["favor", "nope", "defuse"];
        //let removedCards = removePlayerCards(socket.id, [Math.floor(Math.random(player.cards.length-1))]);
        let removedCard = gameState.drawPile.pop();
        //let removedCard = removePlayerCards("testID", ["cat1"]);
        addPlayerCard(socket.id, removedCard);

        console.log("removing cards: ", removedCard);

        //gameState.discardPile = [...gameState.discardPile, ...removedCards];


        socket.send(formatMsg("update_game_state", getGameState(socket)));
        for(const player of gameState.players.values()){
          player.pCardChangedIndices = [];
        }
        break;
      case "get_game_state":
        socket.send(formatMsg("update_game_state", getGameState(socket)));
        break;
      default:
        break;
    }
  });

  socket.onclose = () => {
    console.log(`[INFO] ${socket.id} has disconnected`);
  };
});

function updateLobby(lobby) {
  emitToLobby(lobby);
}
