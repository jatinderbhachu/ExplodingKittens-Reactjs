const socket = new WebSocket("ws://localhost:8080");

socket.onmessage = e => {
  console.log('server: ', event.data)
  console.log(socket);
}