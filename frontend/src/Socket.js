import formatMsg from "./util/util";
//let Socket = new WebSocket("ws://" + window.location.hostname + ":8080");
class CustomSocket {
  constructor(){
    this.socket = undefined;

    this.connect();

  }

  connect() {
    let wsProtocol = (window.location.protocol === "https:") ? "wss://" : "ws://";
    this.socket = new WebSocket(wsProtocol + window.location.hostname + ":8080");
    this.socket.onopen = (e) => {
      console.log("socket is open");
      document.dispatchEvent(new CustomEvent("socket_state_change", {detail: WebSocket.OPEN}));
    };

    this.socket.onclose = (e) => {
      console.log("Socket connection closed, retrying in 3 seconds");
      document.dispatchEvent(new CustomEvent("socket_state_change", {detail: WebSocket.CLOSED}));
      setTimeout(this.connect, 3000);
    }

    console.log(this.socket);
    this.socket.onmessage = (raw) => {
      let msg = JSON.parse(raw.data);
      console.log(msg);

      // use custom events so socket messages can be read from anywhere
      this.dispatchEvent(new CustomEvent(msg.type, { detail: msg.data }));
    };
  }

  dispatchEvent(event){
    this.socket.dispatchEvent(event)
  }

  addEventListener(type, listener){
    this.socket.addEventListener(type, listener);
  }

  removeEventListener(type, listener){
    this.socket.removeEventListener(type, listener);
  }

  send(type, msg) {
    this.socket.send(formatMsg(type, msg));
  }


};

const Socket = new CustomSocket();

export default Socket;
