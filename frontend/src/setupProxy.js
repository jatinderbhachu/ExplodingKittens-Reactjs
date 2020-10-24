const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(createProxyMiddleware("/ws", { 
      target: "http://localhost:8080", 
      changeOrigin: true, // for vhosted sites, changes host header to match to target's host
      ws: true, // enable websocket proxy
    }));
};
