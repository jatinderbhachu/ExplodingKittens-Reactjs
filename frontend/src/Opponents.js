import React from "react";
import CardStack from "./CardStack";
import CardStackOverlay from "./CardStackOverlay";

function Opponents(props) {
  const {
    opponents,
    isStealing,
    favorTarget,
    askingFavor,
    selectStealCard,
    selectFavorCard,
    selectFavorVictim,
  } = props;

  // FIXME: add opponent padding
  //const opponentPadding = 10;
  const opponentWidth = 60 / opponents.length;
  const opponentSpacing = (100 - opponentWidth) / opponents.length;

  return opponents.map((opponent, index) => (
    <React.Fragment key={opponent.id}>
      {opponent.isDead && (
        <CardStackOverlay
          type="dead"
          position={{ top: "5%", left: opponentSpacing * index + "%" }}
          size={{ width: opponentWidth + "%", height: "23%" }}
        />
      )}

      {isStealing && !opponent.isDead && (
        <CardStackOverlay
          type="unselectable"
          position={{ top: "0%", left: opponentSpacing * index + "%" }}
          size={{ width: opponentWidth + "%", height: "28%" }}
        />
      )}

      <CardStack
        type={"opponent"}
        key={opponent.id}
        cards={opponent.cards}
        initialPos={{ x: opponentSpacing * index, y: 5 }}
        boundary={{ width: opponentWidth }}
        name={opponent.name}
        selectable={isStealing}
        hoverable={isStealing}
        setSelectPosition={(index) => selectStealCard(opponent.id, index)}
      />

      {askingFavor && (
        <CardStackOverlay
          type="selectable"
          position={{ top: "0%", left: opponentSpacing * index + "%" }}
          size={{ width: opponentWidth + "%", height: "28%" }}
          clickHandler={() => selectFavorVictim(opponent.id)}
        />
      )}

      {/* FIXME: use an animated c4 background image for this div*/}
      {opponent.drewExploding && (
        <div
          className="BombOverlay"
          style={{
            top: "5%",
            left: opponentSpacing * index + "%",
            width: opponentWidth + "%",
            height: "28%",
          }}
        ></div>
      )}

      {favorTarget === opponent.id && (
        <CardStackOverlay
          type="selectable"
          position={{ top: "0%", left: opponentSpacing * index + "%" }}
          size={{ width: opponentWidth + "%", height: "28%" }}
          clickHandler={() => selectFavorCard()}
        />
      )}
    </React.Fragment>
  ));
}

export default Opponents;
