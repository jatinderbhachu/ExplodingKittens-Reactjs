import React, { useState, useEffect, useContext, useReducer, useRef} from "react";
import { useHistory } from "react-router";
import AppContext from "./AppContext";
import { Animation } from 'react-web-animation';
import Socket from "./Socket";
import Opponents from "./Opponents";
import CardStack from "./CardStack";
import ModalNotification from "./ModalNotification";


import "./styles/Game.css";
import CardStackOverlay from "./CardStackOverlay";

function GameHook() {

  const context = useContext(AppContext);
  const [selectedCards, setSelectedCards] = useState([]);


  /*
  // For debugging purposes
  const [gameState, setGameState] = useReducer(
    (state, newState) => ({...state, ...newState}),
    {
      initialRender: false,
      playerCards: ["cat1", "favor","cat2", "favor", "defuse", "defuse", "skip", "cat2", "favor", "defuse", "cat4", "nope", "cat2", "favor", "defuse"], 
      drawPile: 24,
      discardPile: ["cat2", "favor", "defuse"],
      opponents: [
        {name: "rardboya", cards: 5, id: "nsdfuoihy234", isDead: false, drewExploding: false},
        {name: "ezpz", cards: 7, id: "hy234", isDead: false, drewExploding: false},
        {name: "another1", cards: 4, id: "dfgjn", isDead: false, drewExploding: false},
      ],
      drewExploding: false,
      isDead: false,
      turnsLeft: undefined,
      currentTurn: undefined,
      askingFavor: false,
      isStealing: false,
      insertingExploding: false,
      futureCards: [],
      favorTarget: undefined,
      winner: undefined,

      animCardsInitial: [],
      animCardsTarget: [],
      animCardsName: [],
    }
  );
  */

  const [gameState, setGameState] = useReducer(
    (state, newState) => ({...state, ...newState}),
    {
      initialRender: true,
      playerCards: [], 
      drawPile: [],
      discardPile: [],
      opponents: [],
      isDead: false,
      turnsLeft: undefined,
      currentTurn: undefined,
      askingFavor: false,
      isStealing: false,
      insertingExploding: false,
      futureCards: [],
      favorTarget: undefined,
      drewExploding: false,
      winner: undefined,

      animCardsInitial: [],
      animCardsTarget: [],
      animCardsName: [],
    }
  );


  const drawPileLoc = {x: 10, y: 43};
  const discardPileLoc = {x: 60, y: 43};
  const playerPileLoc = {x: 10, y: 71};
  const moveHistoryLoc = {x: 73, y: 32};


  /**
   * Determine the card piles that have changed, if a pile has a card is added or removed,
   * the position of the piles are used to create an animated card to show what cards
   * move where.
  */
  function updateCardAnims(data, initialPositions, targetPositions, cardNames){

    const {drawPile, discardPile, opponents, playerCards, pCardChangedIndices} = data;

    // Check opponent card diffs
    let opponentWidth = (60/(data.opponents.length));
    let opponentSpacing = (100-opponentWidth)/data.opponents.length;

    let diff;

    for(let i = 0; i < opponents.length; i++){
        diff = opponents[i].cards - gameState.opponents[i].cards;
        if(diff > 0){
          for(let j = 0; j < diff; j++){
            targetPositions.push({top: 5, left: (opponentWidth/2) + opponentSpacing*i});
            cardNames.push("nonameCard");
          }
        } else if(diff < 0) {
          for(let j = 0; j > diff; j--){
            initialPositions.push({top: 5, left: (opponentWidth/2) + opponentSpacing*i});
            cardNames.push("nonameCard");
          }
        }
    }



    // Check discard pile diff
    diff = discardPile.length - gameState.discardPile.length;
    if(diff > 0){
      for(let i = 0; i < diff; i++){
        targetPositions.push({top: discardPileLoc.y, left: discardPileLoc.x });
        cardNames.push(data.discardPile[data.discardPile.length-1]);
      }
    } else if(diff < 0) {
      for(let i = 0; i > diff; i--){
        initialPositions.push({top: discardPileLoc.y, left: discardPileLoc.x });
      }
    }

    // Check draw pile diff
    diff = drawPile - gameState.drawPile;
    if(diff > 0){
      for(let i = 0; i < diff; i++){
        targetPositions.push({top: drawPileLoc.y, left: drawPileLoc.x + (-1/gameState.drawPile)});
      }
    } else if(diff < 0) {
      for(let i = 0; i > diff; i--){
        initialPositions.push({top: drawPileLoc.y, left: drawPileLoc.x + (-1/gameState.drawPile)});
      }
    }

    // use player card changed indices
    diff = playerCards.length - gameState.playerCards.length;
    for(let index of pCardChangedIndices) {
      if(diff > 0){
        targetPositions.push({top: playerPileLoc.y, left: playerPileLoc.x +(71/playerCards.length)*index});
      } else if(diff < 0) {
        initialPositions.push({top: playerPileLoc.y, left: playerPileLoc.x +(71/playerCards.length)*index});
      }
      cardNames.push(data.playerCards[index]);
    }
  }

  function updateGameState(e){
    const data = e.detail;

    /*
     * - get each pile of cards
     * - diff each pile from its old and new state
     * - set target/initial location based on number difference
     * - determine change index of players cards
     *
    */

    if(gameState.initialRender){
      setGameState({...data, initialRender: false});
    } else {
      let initialPositions = [ ...gameState.animCardsInitial ];
      let targetPositions = [ ...gameState.animCardsTarget ];
      let cardNames = [ ...gameState.animCardsName ];

      if(data.opponents){
        updateCardAnims(data, initialPositions, targetPositions, cardNames);
      }

      if(initialPositions.length !== targetPositions.length){
        initialPositions = [];
        targetPositions = [];
        cardNames = [];
      }

      setGameState({...data, animCardsTarget: targetPositions, animCardsInitial: initialPositions, animCardsName: cardNames});
    }

    context.currentTurn = data.currentTurn;
  }

  // when this player is a target of a favor card and is selecting a card to give away
  function selectFavorCard() { 
    if(selectedCards.length < 1) return;
    const { lobbyID } = context;

    if(selectedCards[0] >= 0){
      Socket.send("give_favor_card", {lobbyID: lobbyID, to: gameState.favorTarget, card: gameState.playerCards[selectedCards[0]]});
      //this.setState({favorTarget: undefined});
      //setFavorTarget(undefined);
      setGameState({favorTarget: undefined});
      setSelectedCards([]);
    }
  }


  // TODO: show opponent the card that is being hovered to get stolen
  // recieves the index of the card to steal
  function selectStealCard(opponentID, cardIndex){
    const { lobbyID } = context;

    Socket.send("steal_card", {lobbyID: lobbyID, cardIndex: cardIndex, from: opponentID});
    //this.setState({stealingCard: false});
    //setStealingCard(false);
    setGameState({isStealing: false});
    setSelectedCards([]);
  }

  // after the player uses defuse card, they can select a place in the draw pile to insert the exploding kitten
  function setExplodingPos(index){
    const { lobbyID } = context;

    Socket.send("set_exploding_pos", {index: index, lobbyID: lobbyID});
  }

  useEffect(() => {

    // manually update the gamestate on the initial render
    // without this the server can send an update before this component is rendered
    // because the server sends an update as soon as the game begins
    if(gameState.initialRender){
      Socket.send("get_game_state", {lobbyID: context.lobbyID});
    }

    Socket.addEventListener("update_game_state", updateGameState);

    return function cleanup(){
      Socket.removeEventListener("update_game_state", updateGameState);
    };
  });


  function playSelectedCards(){
    const { lobbyID, currentTurn, ID } = context;
    let cards = selectedCards.map( val => gameState.playerCards[val]);
    if(cards.length < 1 || (cards[0].includes("cat") && cards.length < 2)) return;

    // TODO: check if selected cards are valid, can only play multiple cards if they are of the same type, otherwise can only play 1 action card at once

    if(currentTurn === ID || cards[0] === "nope" ) {
      Socket.send('play_cards', {
        lobbyID: lobbyID,
        cards: cards
      });
      setSelectedCards([]);
    }
  }

  function selectFavorVictim(victimID) {
    const { lobbyID } = context;
    Socket.send('get_favor_from', { lobbyID: lobbyID, from: victimID });
    //setAskingFavor(false);
    setGameState({askingFavor: false});
  }


  function drawCard() {
    const {lobbyID, currentTurn, ID} = context;
    if(!gameState.drewExploding && currentTurn === ID){
      Socket.send("end_turn", {lobbyID: lobbyID});
    }
  }

  let AnimatedCards = [];

  for(let i = 0; i < gameState.animCardsInitial.length; i++){
    const keyframes = [
      {top: `${gameState.animCardsInitial[i].top}%`, left: `${gameState.animCardsInitial[i].left}%`},
      {top: `${gameState.animCardsTarget[i].top}%`, left: `${gameState.animCardsTarget[i].left}%`, opacity: 1, offset: 0.93},
      {top: `${gameState.animCardsTarget[i].top}%`, left: `${gameState.animCardsTarget[i].left}%`, opacity: 0}
    ];

    const timing = {
      duration: 1000,
      easing: 'ease-in',
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fill: 'forwards'
    };
    // FIXME: when one card animation finishes, the rest of the cards will disappear. Remove each card individually
    AnimatedCards.push(
      <Animation key={i} keyframes={keyframes} timing={timing} onFinish={() => {setGameState({animCardsInitial: [], animCardsTarget: [], animCardsName: []});}}>
        <div className={`AnimatedCard ${gameState.animCardsName[i]}`}></div>
      </Animation>);
  }



  const { 
    favorTarget, 
    insertingExploding, 
    currentTurn, 
    drewExploding, 
    playerCards, 
    drawPile, 
    discardPile 
  } = gameState;


  return (
    <div className="GameWrapper">
      <div className="Game">

        {
        <MoveHistory 
          initialPos={moveHistoryLoc}
          size={{width: 24, height: 30}}
        />
        }

        <Opponents 
          opponents={gameState.opponents} 
          isStealing={gameState.isStealing} 
          favorTarget={gameState.favorTarget}
          askingFavor={gameState.askingFavor}
          selectStealCard={selectStealCard}
          selectFavorCard={selectFavorCard}
          selectFavorVictim={selectFavorVictim}
        />


        {AnimatedCards}

        {
          insertingExploding &&
          <CardStackOverlay
            type="unselectable"
            position={{top: drawPileLoc.y-5+"%", left: drawPileLoc.x+"%"}}
            size={{width: "40%", height: "28%"}}
            />
        }
        <CardStack 
          cards={drawPile} 
          initialPos={drawPileLoc}
          boundary={{width: (insertingExploding ? 40 : 10) }}
          hoverable={insertingExploding}
          selectable={insertingExploding}
          name={gameState.currentTurn === context.ID ? "Draw Card" : undefined}
          setSelectPosition={(index) => setExplodingPos(index)}
        />
        {
          (currentTurn === context.ID && !drewExploding && !gameState.askingFavor && !gameState.isStealing) && 
            <CardStackOverlay
              type="selectable"
              position={{top: drawPileLoc.y-5+"%", left: drawPileLoc.x+"%"}}
              size={{width: "10%", height: "28%"}}
              clickHandler={() => drawCard()}
            />
        }


        <CardStack 
          cards={discardPile} 
          initialPos={discardPileLoc}
          boundary={{width: 8}}
          hoverable={false}
          name="Play Cards"
        />
        {
          (gameState.playerCards.indexOf("nope") > -1 || currentTurn === context.ID ) && 
            <CardStackOverlay
              type="selectable"
              position={{top: discardPileLoc.y-5+"%", left: discardPileLoc.x+"%"}}
              size={{width: "10%", height: "28%"}}
              clickHandler={() => playSelectedCards()}
            />
        }

        <CardStack 
          cards={playerCards} 
          initialPos={playerPileLoc}
          boundary={{width: 80}}
          selectable={true}
          hoverable={true}
          favorTarget={favorTarget}
          selectedCards={selectedCards}
          changeSelectedCards={(cards) => setSelectedCards(cards)}
        />
        {
        gameState.isDead && 
          <CardStackOverlay 
            type="dead"
            position={{top: (playerPileLoc.y)+"%", left: playerPileLoc.x+"%"}}
            size={{width: "80%", height: "23%"}}
            />
        }


        { (gameState.currentTurn === context.ID) &&
          <ModalNotification duration={3} msg="It's your turn!"/>

        }

        { gameState.drewExploding && 
          <ModalNotification duration={5} msg="You drew an exploding kitten!"/>
        }

        { gameState.favorTarget &&
          <ModalNotification duration={5} msg={gameState.opponents.find(op => op.id === gameState.favorTarget).name + " is asking you for a favor! Give them a card of your choice." }/>
        }

        { gameState.turnsLeft > 1 &&
          <ModalNotification duration={5} msg={`You have been attacked!, draw a card ${gameState.turnsLeft}x to end your turn.`}/>
        }

        { gameState.insertingExploding && 
          <ModalNotification duration={5} msg="Select a spot in the draw pile to hide the exploding kitten"/>
        }

        { (gameState.futureCards.length > 0) &&
          <FutureCards cards={gameState.futureCards} resetFutureCards={() => setGameState({futureCards: []})}/>
        }

        { gameState.winner && <WinnerPopup winner={gameState.winner} opponents={gameState.opponents} ID={context.ID}/> }

      </div>
    </div>
  );
}


function WinnerPopup(props) {
  let winnerID = props.winner;
  let opponents = props.opponents;
  let clientID = props.ID;
  let winnerName;

  const context = useContext(AppContext);
  const history = useHistory();

  // get opponent name
  for(let opp of opponents) { if(opp.id === winnerID) winnerName = opp.name; }

  function gameOverCleanup() {
    // tell server to delete the game lobby 
    Socket.send("post_game_cleanup", {lobbyID: context.lobbyID});
    context.lobbyID = undefined;
    context.inGame = false;
    context.isHost = false;

    // return to home page
    history.push("/");
  }

  return(
    <div onClick={() => gameOverCleanup()} className="WinnerNotification">
      <h2>GAME OVER</h2>
      <div >
        {(winnerID === clientID) ? "You Won!" : "You Lost, the winner is " + winnerName}
      </div>
      <div>Click anywhere to return to home page</div>
    </div>
  );
}

function FutureCards(props) {
  let boundary = 40;
  let spacing = (boundary/3);
  let inc = 0;
  let initialPos = {x: 25, y: 25}
  return (
      <div className="FutureCardsNotification">
        <h3>Future cards</h3>
        {props.cards.map( (cardName, index) => 
        <div 
          className={"Card FuturePopup " + cardName}
          key={index}
          style={{top: initialPos.y+"%", left: initialPos.x+(spacing*(inc++))+"%", zIndex: 2}}
        ></div>
        )}
        <div onClick={() => props.resetFutureCards()}>Click here to close</div>
      </div>
  )

}

function MoveHistory(props) {
  const [history, setHistory] = useState([]);

  const { initialPos, size } = props;
  const lastItem = useRef(null);


  function updateMoveHistory(e) {
    const data = e.detail;

    setHistory(data.moveHistory);
  }


  useEffect(() => {
    Socket.addEventListener("update_move_history", updateMoveHistory);
    if(lastItem.current){
      lastItem.current.scrollIntoView({ behavior: "smooth" })
    }

    return function Cleanup(){
      Socket.removeEventListener("update_move_history", updateMoveHistory);
    }

  });

  function formatTime(s) {
    //return (Math.floor(seconds/60) + ":" + (seconds % 60) );

    // https://stackoverflow.com/a/37770048
    return(s-(s%=60))/60+(9<s?':':':0')+s;
  }

  return (
    <div
      className="MoveHistory" 
      style={{top: (initialPos.y)+"%", left: (initialPos.x)+"%", width: size.width+"%", height: size.height+"%"}}>
      <h3>Move History</h3>
      <div className="MoveHistory-list"
      >
        {history.map( (move, index) => <div className="MoveHistory-item" ref={lastItem} key={index}>
          <div>{formatTime(move.time)}</div><div>{move.move}</div>
        </div>)}
      </div>
    </div>
  );

}



export default GameHook;
