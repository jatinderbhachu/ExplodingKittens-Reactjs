import React, { useContext, useState } from "react";

import "./styles/NameForm.css";
import AppContext from "./AppContext";

function NameForm(props) {
  const [name, setName] = useState("");
  const context = useContext(AppContext);


  function handleSubmit(e){
    e.preventDefault();

    context.playerName = name;
    // FIXME: validate the name
    props.setNameHandler(name);
  }

    return (
      <>
      <header className="AppHeader"><h1>Exploding Kittens</h1></header>
      <div className="NameForm-Container">
        <div className="NameForm">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="nickname"
              id="nickname"
              placeholder="Enter nickname ... "
              value={name}
              onChange={ e => setName(e.target.value) }
              required
            />
            <br />
            <input type="submit" value="Set name"/>
          </form>
        </div>
      </div>
      </>
    );


}

export default NameForm;
