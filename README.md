# ExplodingKittens-Reactjs
 A clone of the Exploding Kittens card game, but now playable in your web browser. Created using React/Nodejs with WebSockets
 
# WIP
- Card designs are not final, the images are just placeholders, some cards dont have an image
- Different card sets/packs

# Screenshots
![In game](https://jatinderbhachu.github.io/public/expKittensS4.png)
![Game over screen](https://jatinderbhachu.github.io/public/expKittensS5.png)

# Build and Run

Build the frontend

`cd frontend && npm run build`

Run the server

`node index.js`

## Hosting
1. Create a .env file in the root directory and set `NODE_ENV=production`, otherwise the app will run an HTTP server for development
2. Create a `ssl/` directory and add `cert.pem` and `key.pem` to enable ssl in order to run HTTPS. You could also modify the path of these files inside index.js to wherever you have stored your ssl certificates.
