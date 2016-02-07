var args = require('optimist').argv;
var config = require(args.config || './config.js');
var net = require('net');
var tls = require('tls');
var events = require('events');
var express = require('express');
var fs = require('fs');
var sets = require('simplesets');

global.log = require('./src/Logging');

var Session = require('./src/Session');
var Room = require('./src/Room');
var Plugins = require('./src/Plugins');


function Server() {
  // "Constructor" for the Object. Remember, no such thing as classes in JS...
  var _sessions = new sets.Set();
  var _rooms = {};
  var _userList = Array();
  var _plugins = new Plugins(this);

  // Properties that were on the old Server "class" object:
  var serverObject = null;
  var sslServerObject = null;

  return {
    start: start,
    startWebServer: startWebServer,
    onConnect: onConnect,
    getRoom: getRoom,
    isNameFree: isNameFree,
  };

  function start() {
    // Start Socket Server
    console.log('========================');
    console.log('Janus VR Presence Server');
    console.log('========================');
    log.info('Startup date/time: ' + Date());

    console.log('See server.log for activity information and config.js for configuration');
    console.log('Log level: ' + config.logLevel);
    console.log('Startup date/time: ' + Date());

    serverObject = net.createServer(onConnect);
    server.listen(config.port, "::", function(err) {
      if (err) {
        log.error('Socket Server error listening on port: ' + config.port);
        process.exit(1);
      }
      log.info('Socket Server listening on port: ' + config.port);
      console.log('Socket Server listening on port: ' + config.port);
    });

    // Only listen for SSL connections if it's configured:
    if (config.ssl) {
      sslServerObject = tls.createServer(config.ssl.options, onConnect);
      sslServerObject.listen(config.ssl.port, "::", function(err) {
        if (err) {
          log.error('SSL Server error listening on port: ' + config.ssl.port);
          process.exit(1);
        }
        console.log('SSL Server listening on port: ' + config.ssl.port);
        log.info('SSL Server listening on port: ' + config.ssl.port);
      });
    }

    this.startWebServer();
  }
  function startWebServer() {
    // start web server
    var self = this;
    this.ws = express();
    var router = express.Router();

    router.get('/log', function(req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': -1,
        'Transfer-Encoding': 'chunked'
      });
      var logFile = fs.createReadStream('server.log');
      logFile.pipe(res);
    });

    router.get('/', function(req, res) {
      res.send(200, 'Nothing to see here ... yet');
    });

    this.ws.use(router);

    this.ws.listen(config.webServer, "::");
    log.info('Webserver started on port: ' + config.webServer);
    console.log('Start Date/Time: ' + Date());
  }
  function onConnect(socket) {
    var self = this;
    var addr = socket.remoteAddress;
    log.info('Client connected ' + addr);

    var thisSession = new Session(this, socket);
    _sessions.add(thisSession);

    socket.on('close', function() {
      log.info('Client disconnected: ' + addr);
      _sessions.remove(thisSession);
    });

    socket.on('error', function(err) {
      log.error(addr);
      log.error('Socket error: ', err);
    });
  }
  function getRoom(roomId) {
    if (this._rooms[roomId] === undefined) {
      this._rooms[roomId] = new Room(roomId);
    }

    return this._rooms[roomId];
  }
  function isNameFree(name) {
    // Check if username is in use
    var free = true;
    this._sessions.each(function(s) {
      if (s.id === name) {
        free = false;
      }
    });
    return free;
  }
}

// Build an instance of the Server object and call start() to get Express going
var serverInstance = Server();
serverInstance.start();
