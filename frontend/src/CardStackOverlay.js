import React from "react";

import "./CardStackOverlay.css";

function CardStackOverlay(props) {
  const { clickHandler, position, size, type } = props;
  let className;

  switch(type){
    case "selectable":
      className = "CardStackOverlay";
      break;
    case "unselectable":
      className = "CardStackOverlay-unselectable";
      break;
    case "dead":
      className = "CardStackOverlay-DeadPlayer";
      break;
    default:
      break;
  }

  return (
    <div
      className={className}
      style={{...position, ...size}}
      onClick={type==="selectable" ? () => clickHandler(): undefined}
    ></div> 
  );

}

export default CardStackOverlay;
