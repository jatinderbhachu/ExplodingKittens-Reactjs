const { v4: uuid } = require("uuid");

function formatMsg(type, data) {
  return JSON.stringify({ type, data });
}

// variable to track current turn
// variable to track next turn
// attribute in each player to determine if its their turn
// during a players turn, they can player any action cards
// their turn only ends when they draw a card from the draw pile
// if a exploding kitten is draw, they must use a defuse. If they do not have a defuse,
// they lose

class Lobby {
  // lobby will have a invite code, name, max players, card set setting for the game
  constructor() {
    //this.name = "";
    //this.maxPlayers = 8;
    //this.cardSet = "";
    // create states:
    // IN_LOBBY
    // IN_GAME
    // WINNER_DECLARED
    // EMPTY
    this.state = "IN_LOBBY";
    //this.gameState.players = new Map();
    this.turnOrder = [];
    this.inviteCode = uuid().replace(/-/g, "");

    //this.gameState.drawPile = [];
    this.exploding = false;
    //this.gameState.discardPile = [];

    // the id of the player whose turn it is
    // the index of turnOrder
    this.currentTurnIndex = undefined;
    this.deadPlayers = 0;

    this.cardTypes = {
      exploding: 4,
      defuse: 6,
      attack: 4,
      favor: 4,
      nope: 10,
      shuffle: 4,
      skip: 4,
      future: 5,
      cat1: 4,
      cat2: 4,
      cat3: 4,
      cat4: 4,
      cat5: 4,
    };

    this.gameStartTime = undefined;

    this.moveHistory = [];

    this.gameState = {
      players: new Map(),
      drawPile: [],
      discardPile: [],
      currentTurn: undefined,
      winner: undefined,
    };
    this.prevGameState = {};
    this.updatePrevGameState();


    // FIXME: move to setupGame() method
    for (let [cardType, count] of Object.entries(this.cardTypes)) {
      if (cardType !== "exploding" && cardType !== "defuse") {
        for (let i = 0; i < count; i++) {
          this.gameState.drawPile.push(cardType);
        }
      }
    }

    // shuffle the array
    for (let i = this.gameState.drawPile.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [this.gameState.drawPile[i], this.gameState.drawPile[j]] = [
        this.gameState.drawPile[j],
        this.gameState.drawPile[i],
      ];
    }
    console.log(this.gameState.drawPile);
  }

  addPlayer(socket, name, isHost, isReady) {

    this.gameState.players.set(socket.id, {
      socket,
      name,
      isHost,
      isReady: true, // FIXME: get if player is ready
      isDead: false,
      isStealing: false,
      myTurn: false,
      awaitingFavor: false,
      /*
        Number of times the player has to draw a card to end their turn, 
        if it is > 1, the player is victim of attack card and must draw multiple times
       */
      turnsLeft: 1,
      cards: [],
      askingFavor: false,
      favorTarget: null,
      pCardChangedIndices: [],
    });

  }

  /*
   * GAME LOOP
   *  - player either plays a card, or doesnt
   *      - ends turn by drawing a card
   *  - can play as many cards as you want, as long as you end the turn by drawing a card
   *  - if you draw a exploding kitten, use defuse or you explode
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
   *  - favor: 4 // DONE
   *      force another player to give you a card of their choice
   *  - NOPE: 5
   *      deny any action exception exploding or defuse, can nope a nope
   *  - shuffle: 4 // DONE
   *      shuffle the deck
   *  - skip: 4 // DONE
   *      ends your turn, allows you to not draw, can be used when attacked
   *      but will only consume one of the 2 turns
   *  - see the future: 5 // DONE
   *      allows the player to see the next 3 cards on the deck
   *  - cat cards: 4 of each, 5 unique cats, 20 cat cards total
   *      playing a combination of these cards has special effects
   *      2 matching cards allows you to steal any card from another player,
   *      but you cannot see which card
   */

  // TODO: exploding, defuse, attack, NOPE, cat
  // move history, current move the player made
  playCards(socket, cards) {
    if(cards[0] !== "nope"){
      this.updatePrevGameState();
    }

    if(this.gameState.players.get(this.gameState.currentTurn).drewExploding){
      if(cards[0] === "defuse"){
        this.gameState.players.get(socket.id).isDead = false;
        this.gameState.players.get(socket.id).insertingExploding = true;
        //socket.send(formatMsg("select_exploding_pos", {}));
      } else if(cards[0] === "nope") {
        let lastCard = this.gameState.discardPile[this.gameState.discardPile.length-1];
        if(lastCard !== "favor" || !lastCard.includes("cat"))
          return;
      } else if (cards[0] !== "favor" || cards[0].includes("cat")){
        this.gameState.players.get(this.gameState.currentTurn).isDead = true;
        this.gameState.players.get(this.gameState.currentTurn).drewExploding = true;
        this.gameState.players.get(this.gameState.currentTurn).insertingExploding = false;
        this.deadPlayers++;

        // put exploding back into random place in draw pile
        this.exploding = false;
        this.removePlayerCards(socket.id, ["exploding"])
        this.gameState.drawPile.splice(Math.random() * this.gameState.drawPile.length, 0,"exploding");
        this.nextTurn();
        this.updateTurn();

        this.updateGameState();

        return;
      }
    }

    if (cards.length > 1) {
      // FIXME: check if all cards are of type cat
      //socket.send(formatMsg('use_steal', {}));

      this.gameState.players.get(socket.id).isStealing = true;
    } else {
      if(cards[0] === "nope") { // NOPE
        //console.log("used nope, current game state", this.gameState);
        //console.log("prev game state: ",  this.prevGameState);
        //this.gameState = this.prevGameState;

        // for when the another player uses a nope card to cancel out this nope
        // this.updatePrevGameState();

        // dont do anything if a exploding kitten was drawn or defuse was used
        let lastCard = this.gameState.discardPile[this.gameState.discardPile.length-1];
        if(lastCard === "defuse") {
          console.log("tried to nope a defuse. returning ...");
          return;
        }

        // do not restore the game state if the previous card played was a defuse
        this.restorePrevGameState();

        let currentPlayer = this.gameState.players.get(this.gameState.currentTurn);
        this.addMoveHistoryItem(this.gameState.players.get(socket.id).name + " noped " + lastCard);

      } else if (cards[0] === "shuffle") { // SHUFFLE
        console.log("shufling cards, Current Cards: ", this.gameState.drawPile);

        let currentPlayer = this.gameState.players.get(this.gameState.currentTurn);
        this.addMoveHistoryItem(currentPlayer.name + " used shuffle");

        for (let i = this.gameState.drawPile.length - 1; i > 0; i--) {
          let j = Math.floor(Math.random() * (i + 1));
          [this.gameState.drawPile[i], this.gameState.drawPile[j]] = [
            this.gameState.drawPile[j],
            this.gameState.drawPile[i],
          ];
        }
        console.log("Shuffled Cards: ", this.gameState.drawPile);
      } else if (cards[0] === "future") { // FUTURE

        let currentPlayer = this.gameState.players.get(this.gameState.currentTurn);
        this.addMoveHistoryItem(currentPlayer.name + " used future, peaking at the top 3 cards :o");
        // get top 3 cards
        let topCards = this.gameState.drawPile.slice(
          this.gameState.drawPile.length - 3,
          this.gameState.drawPile.length
        );

        currentPlayer.futureCards = topCards;

      } else if (cards[0] === "skip") { // SKIP
        let currentPlayer = this.gameState.players.get(this.gameState.currentTurn);
        this.addMoveHistoryItem(currentPlayer.name + " ended their turn by using a skip");
        // skip this.gameState.players turn, not forced to draw a card to end turn
        this.nextTurn();
        this.updateTurn();
      } else if (cards[0] === "favor") { // FAVOR
        this.gameState.players.get(socket.id).askingFavor = true;
      } else if(cards[0] === "attack") { // ATTACK
        let currentPlayer = this.gameState.players.get(this.gameState.currentTurn);
        let currTurnsLeft = currentPlayer.turnsLeft;
        currentPlayer.turnsLeft = 1;

        this.addMoveHistoryItem(currentPlayer.name + " ended their turn by using an ATTACK");

        console.log(currentPlayer.name + " Used attack card");
        console.log(currentPlayer.name + " turns left: " + currTurnsLeft);
        
        // move to next player
        this.nextTurn();
        // force them to draw the cumulative amount of cards
        let nextPlayer = this.gameState.players.get(this.gameState.currentTurn);
        nextPlayer.turnsLeft = currTurnsLeft+1;
        console.log(nextPlayer.name + " turns left: " + nextPlayer.turnsLeft);

        this.addMoveHistoryItem(nextPlayer.name + " must now draw a card " + nextPlayer.turnsLeft + "x");

        this.updateTurn();
        this.updateGameState();
      }
    }

    //remove the played card, add it to discard pile
    const player = this.gameState.players.get(socket.id);
    //this.gameState.discardPile = [...this.gameState.discardPile, ...removedCards];
    for (let card of cards) {
      player.cards.splice(player.cards.indexOf(card), 1);

      this.gameState.discardPile.push(card);
    }

    //this.prevGameState = this.gameState;
    //console.log("played cards, prevGameState", this.prevGameState);
    this.updateGameState();
  }

  /*
   * player uses favor card, gets a card from victim
   * victim uses nope card
   * victim gets his card restored
   * player gets his card restored
   * victims nope card is used up
  */
  
  restorePrevGameState(){
    const prevStateCopy = this.getPrevGameState();
    const currentPlayer = { ...this.gameState.players.get(this.gameState.currentTurn) };

    let restorePrevCards = true;
    let lastCard;
    const discardPile = this.gameState.discardPile;
    for(let i = discardPile.length-1; i >= 0; i--){
      if(discardPile[i] !== "nope"){
        lastCard = discardPile[i];
      }
    }

    for(let player of this.gameState.players.values()){
      if(player.askingFavor || player.favorTarget){
        restorePrevCards = false;
        break;
      }
      if(player.isStealing){
        restorePrevCards = false;
        break;
      }
      if(player.drewExploding){
        restorePrevCards = false;
        break;
      }
    }

    if(lastCard === "future")
      restorePrevCards = false;

    //this.gameState.players = new Map();
    for(let player of this.prevGameState.players.values()){
      // create a new copy of the player and player cards
      const {cards, ...newPlayer} = {...player};

      if(restorePrevCards){
        newPlayer.cards = [...player.cards];
      } else {
        newPlayer.cards = [...this.gameState.players.get(player.socket.id).cards];
      }

      // causes cards from prev state to be removed
      newPlayer.pCardChangedIndices = [];

      this.gameState.players.set(player.socket.id, newPlayer);
    }
    this.gameState.drawPile = this.prevGameState.drawPile;
    this.gameState.discardPile = this.prevGameState.discardPile;
    if(lastCard === "skip" || lastCard === "attack"){
      this.gameState.currentTurn = this.prevGameState.currentTurn;
    }

    //console.log(this.prevGameState, prevStateCopy);

    // update prev gamestate in case someone nopes the nope
    this.prevGameState = prevStateCopy;

  }

  updatePrevGameState() {
    this.prevGameState.players = new Map();
    for(let player of this.gameState.players.values()){
      let newPlayer = {...player};
      newPlayer.cards = [...player.cards];
      this.prevGameState.players.set(player.socket.id, newPlayer);
    }
    this.prevGameState.drawPile = this.gameState.drawPile;
    this.prevGameState.discardPile = this.gameState.discardPile;
    this.prevGameState.currentTurn = this.gameState.currentTurn;
  }

  /**
   * returns a deep copy of the previous game state
  */
  getPrevGameState() {
    let state = {};
    state.players = new Map();
    for(let player of this.prevGameState.players.values()){
      let newPlayer = {...player};
      newPlayer.cards = [...player.cards];
      state.players.set(player.socket.id, newPlayer);
    }
    state.drawPile = this.prevGameState.drawPile;
    state.discardPile = this.prevGameState.discardPile;
    state.currentTurn = this.prevGameState.currentTurn;
    return state;
  }

  setupGame() {
    this.state = "IN_PROGRESS";
    for (let [id, player] of this.gameState.players.entries()) {
      // give player 7 random cards from the draw pile
      for (let i = 0; i < 7; i++) {
        let randCard = Math.floor(Math.random() * this.gameState.drawPile.length);
        player.cards.push(this.gameState.drawPile.splice(randCard, 1)[0]);
      }

      //player.cards.push("favor");
      //player.cards.push("nope");

      // give each player a defuse card
      player.cards.push("defuse");
      this.cardTypes["defuse"]--;
      console.log(player.name, player.cards);
    }

    // if theres 3 or 2 players, only put in 2 defuse cards
    let numDefuse = this.gameState.players.length <= 3 ? 2 : this.cardTypes["defuse"];

    // add the remaining defuse cards into the draw pile
    for (let i = 0; i < numDefuse; i++) {
      let insertIndex = Math.floor(Math.random() * this.gameState.drawPile.length);
      this.gameState.drawPile.splice(insertIndex, 0, "defuse");
    }

    // insert numPlayers-1 exploding kittens into the draw pile
    for (let i = 0; i < this.gameState.players.size - 1; i++) {
    //for (let i = 0; i < 4; i++) {
      let insertIndex = Math.floor(Math.random() * this.gameState.drawPile.length);
      console.log("inseting exploding at " + insertIndex);
      this.gameState.drawPile.splice(insertIndex, 0, "exploding");
    }

    // tell every client to start the game
    // determine the player who will play first turn

    for(let key of this.gameState.players.keys()){
      this.turnOrder.push(key);
    }
    console.log("turn order: ",  this.turnOrder);

    let randPlayer = Math.floor(Math.random() * this.gameState.players.size);
    this.currentTurnIndex = randPlayer;
    this.gameState.currentTurn = this.turnOrder[this.currentTurnIndex];

    this.gameState.players.get(this.gameState.currentTurn).myTurn = true;
    //this.updateTurn();

    console.log("Setup Draw Pile: ", this.gameState.drawPile);
    this.emit(
      formatMsg("start_game", {
        currentTurn: this.gameState.currentTurn,
      })
    );

    this.gameStartTime = new Date().getTime();

  }

  // gets the current gamestate to the specified socket
  getGameState(socket) {
    let opponents = [];
    for(let player of this.gameState.players.values()){
      if(player.socket.id !== socket.id){
          opponents.push({ 
            name: player.name,
            id: player.socket.id,
            cards: player.cards.length,
            isDead: player.isDead,
            drewExploding: player.drewExploding
          });
      }
    }
    let player = this.gameState.players.get(socket.id);

    return {
      opponents,
      drawPile: this.gameState.drawPile.length,
      discardPile: this.gameState.discardPile,
      playerCards: player.cards,
      drewExploding: player.drewExploding,
      insertingExploding: player.insertingExploding,
      currentTurn: this.gameState.currentTurn,
      turnsLeft: player.turnsLeft,
      askingFavor: player.askingFavor,
      stealingCard: player.stealingCard,
      insertingExploding: player.insertingExploding,
      favorTarget: player.favorTarget,
      futureCards: player.futureCards,
      pCardChangedIndices: player.pCardChangedIndices,
      winner: this.gameState.winner,
    };
  }


  updateGameState() {
    for(let player of this.gameState.players.values()){
      let opponents = [];
      for(let opponent of this.gameState.players.values()){
        if(opponent.socket.id !== player.socket.id){
          opponents.push({ 
            name: opponent.name,
            id: opponent.socket.id,
            cards: opponent.cards.length,
            isDead: opponent.isDead,
            drewExploding: opponent.drewExploding
          });
        }
      }

      player.socket.send(formatMsg("update_game_state", {
        opponents: opponents,
        drawPile: this.gameState.drawPile.length,
        discardPile: this.gameState.discardPile,
        playerCards: player.cards,
        drewExploding: player.drewExploding,
        insertingExploding: player.insertingExploding,
        currentTurn: this.gameState.currentTurn,
        turnsLeft: player.turnsLeft,
        isStealing: player.isStealing,
        askingFavor: player.askingFavor,
        favorTarget: player.favorTarget,
        futureCards: player.futureCards,
        isDead: player.isDead,
        pCardChangedIndices: player.pCardChangedIndices,
        winner: this.gameState.winner,
      }));
      player.pCardChangedIndices = [];
      player.futureCards = [];

      //player.socket.send(formatMsg("update_move_history", {moveHistory: this.moveHistory}))

    }
    this.updateMoveHistory();
  }

  addPlayerCard(socketID, card, index){
    const player = this.gameState.players.get(socketID);
    if(!index){
      index = player.cards.length;
    }
    player.pCardChangedIndices.push(index);
    player.cards.splice(index, 0, card);
  }

  removePlayerCards(socketID, cards){
    let removedCards = [];
    const player = this.gameState.players.get(socketID);
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
        removedCards.push(removedCard);
      }
    }

    return removedCards;
  }

  // sets the next turn
  nextTurn() {
    let currentPlayer = this.gameState.players.get(this.gameState.currentTurn);
    if(this.deadPlayers === this.gameState.players.size - 1){
      currentPlayer.myTurn = false;
      if (this.currentTurnIndex + 1 === this.gameState.players.size) {
        this.currentTurnIndex = 0;
      } else {
        this.currentTurnIndex++;
      }
      this.gameState.currentTurn = this.turnOrder[this.currentTurnIndex];
      this.gameState.players.get(this.gameState.currentTurn).myTurn = true;

      console.log("everyone is dead, winner is " + this.gameState.players.get(this.gameState.currentTurn).name);
      this.gameState.winner = this.gameState.currentTurn;
      return;
    }

    // set current player turn to false
    // if the player has more cards left to draw, dont go to next player
    if(currentPlayer.turnsLeft > 1){
      currentPlayer.turnsLeft--;
      this.addMoveHistoryItem(currentPlayer.name + " drew a card");

    } else {
      let lastCard = this.gameState.discardPile[this.gameState.discardPile.length-1];
      if(!(lastCard === "skip" || lastCard === "attack" || lastCard === "defuse")){
        this.addMoveHistoryItem(currentPlayer.name + " ended their turn by drawing a card");
      }

      currentPlayer.myTurn = false;
      if (this.currentTurnIndex + 1 === this.gameState.players.size) {
        this.currentTurnIndex = 0;
      } else {
        this.currentTurnIndex++;
      }

      this.gameState.currentTurn = this.turnOrder[this.currentTurnIndex];

      // update new player turn
      this.gameState.players.get(this.gameState.currentTurn).myTurn = true;
      // if the next player isDead, go next

      if(this.gameState.players.get(this.gameState.currentTurn).isDead){
        this.nextTurn();
      }
    }

  }

  drawCard() {
    let drawnCard = this.gameState.drawPile.pop();
    //if(drawnCard !== "exploding"){
      //this.gameState.players.get(this.gameState.currentTurn).cards.push(drawnCard);
    //}
    this.addPlayerCard(this.gameState.currentTurn, drawnCard);

    return drawnCard;
  }

  addMoveHistoryItem(item){
    this.moveHistory.push({time: Math.floor((new Date().getTime() - this.gameStartTime)/1000), move: item});
    if(this.moveHistory.length > 10){
      this.moveHistory.shift();
    }
  }

  updateMoveHistory(){
    this.emit(formatMsg("update_move_history", {moveHistory: this.moveHistory}));
  }

  updateTurn() {
    this.emit(
      formatMsg("update_turn", {
        currentTurn: this.gameState.currentTurn,
      })
    );
  }

  /**
   * sends a message to every client in the lobby
   */
  emit(msg) {
    for (let [id, player] of this.gameState.players.entries()) {
      player.socket.send(msg);
    }
  }

  updateLobby() {
    console.log("[INFO] updating lobby");
    let lobbyPlayers = [];
    for (let [id, player] of this.gameState.players.entries()) {
      lobbyPlayers.push({
        id: player.socket.id,
        name: player.name,
        isHost: player.isHost,
        isReady: player.isReady
      });
    }

    this.emit(
      formatMsg("update_lobby", {
        players: lobbyPlayers,
        settings: { inviteCode: this.inviteCode},
      })
    );
  }

  static getPlayerLobby(lobbies, socket) {
    for (const lobby of lobbies) {
      for (const player of lobby.players) {
        if (player.socket.id === socket.id) return lobby;
      }
    }
    return undefined;
  }


} // Lobby class

module.exports = Lobby;
