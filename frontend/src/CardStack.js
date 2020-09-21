import React from "react";

function CardStack(props) {
  const { cards, initialPos, boundary, selectable} = props;
  let spacing = ((boundary.width-9)/cards.length);

  let selectedCards = [];
  if(selectable){
    selectedCards = props.selectedCards;
  }

  let inc = 0;

  if(!Array.isArray(cards)){
    spacing = ((boundary.width-9)/cards);
    if(boundary.width <= 9 && props.type === "opponent")
      spacing = 0;

    return(
      <>
        {Array.from({ length: cards }, (_, key) => (
          <div
            className={`Card ${props.hoverable ? "Hoverable" : ""} nonameCard`}
            key={key}
            style={{top: initialPos.y+"%", left: (initialPos.x+spacing*(inc++))+"%"}}
            onClick={props.selectable ? () => props.setSelectPosition(key) : undefined}
          ></div>
        ))}
        {props.name && 
          <div 
            className="OpponentName"
            style={{top: (initialPos.y-5)+"%", left: (initialPos.x+spacing*(cards/2))+"%"}}
          >{props.name}</div>
        }
      </>
    );
  }

  // changes the selectedCards whenever a card is clicked
  // can only select multiple cards if they are of type cat
  function changeSelectedCards(card){
    let selectedCards = props.selectedCards;
    //let indexOfCard = selectedCards.indexOf(card);
    if(props.favorTarget){
      props.changeSelectedCards([card]);
      return;
    }
    if(selectedCards.length < 1){
      props.changeSelectedCards([card]);
    } else if(cards[selectedCards[0]].includes("cat") && cards[card].includes("cat") && selectedCards.indexOf(card) === -1){
      //if(indexOfCard === -1){
        props.changeSelectedCards([...selectedCards, card]);
      //}
    } else{
      props.changeSelectedCards([card]);
    }
  }

  return(
    <>
      {props.name && 
        <div 
          className="OpponentName"
          style={{top: (initialPos.y-5)+"%", left: (initialPos.x+(spacing | 0)*(inc))+"%"}}
        >{props.name}</div>
      }
      {
        cards.map((card, index) => 
          <Card 
            hoverable={props.hoverable} 
            selected={selectedCards.indexOf(index) !== -1}
            key={index} 
            cardName={card}
            cardIndex={index}
            changeSelectedCards={props.selectable ? () => changeSelectedCards(index) : undefined}
            position={{top: initialPos.y+"%", left: (initialPos.x+spacing*(inc++))+"%"}}
          />
      )
      }
    </>
  );
}

const CardToolTips = {
  "favor": "Select another player and force them to hand over a card of their choice",
  "attack": "Skip your turn, next player must draw 2 cards",
  "cat1": "Use in combination with another cat card to steal any card from anyone",
  "cat2": "Use in combination with another cat card to steal any card from anyone",
  "cat3": "Use in combination with another cat card to steal any card from anyone",
  "cat4": "Use in combination with another cat card to steal any card from anyone",
  "cat5": "Use in combination with another cat card to steal any card from anyone",
  "skip": "End your turn without drawing a card",
  "defuse": "Defuse an exploding kitten card",
  "exploding": ":]",
  "shuffle": "Shuffle the draw pile",
  "nope": "Cancel any action except a defuse or exploding kitten",
  "future": "Peak at 3 cards on top of the draw pile"
};

function Card(props){

  return(
    <div 
      className={`Card ${props.hoverable ? "Hoverable" : ""} ${props.selected ? "selected" : ""} ${props.cardName}`}
      onClick={props.changeSelectedCards}
      style={props.position}>
      <div className="CardToolTip">{CardToolTips[props.cardName]}</div>
      </div>
  )

}

export default CardStack;

