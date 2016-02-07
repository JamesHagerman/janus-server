var args = require('optimist').argv;
var config = require(args.config || '../config.js');
var Session = require('./Session');

function Plugins(server) {
  this._plugins = [];
  this._intervals = [];
  this._methodPlugins = [];
  this._server = server;

  this.intervalLoad();
  this.methodLoad();
}

Plugins.prototype.intervalLoad = function() {
  // Load the list of plugins from the config file
  var plugins = config.intervalPlugins;

  // For each plugin, call its 'constructor' and then wait for 1 second before
  // calling the ".call()" method on that plugin.
  // TODO: Fix this. It's soooo bad! At least use callbacks.....
  // TODO: Use Object.keys()...
  for (var p in plugins) {
    var file = plugins[p].plugin;
    var plugin = require(file);
    var interval = new plugin(this._server);

    this._intervals[p] = setInterval(callInterval, (plugins[p].interval * 1000));
  }

  var callInterval = function() {
    // TODO: Fix closure scope for 'this'...
    interval.call(this._server);
  };

};

Plugins.prototype.methodLoad = function() {
  var plugins = config.methodPlugins;

  for (var method in plugins) {
    var file = plugins[method].plugin;
    var plugin = require(file);
    Session.validMethods.push(method);
    Session.prototype[method] = plugin.call;
  }
};

Plugins.prototype.call = function(name, socket, command) {
  var hook = config.hookPlugins[name];

  for (var k in hook.plugins) {
    var p = hook.plugins[k];

    if (typeof p === 'undefined') {
      err = "Unable to load plugin " + p;
      log.info(err);
      console.log(err);
      return;
    }

    if (typeof this._plugins[name] === 'undefined') {
      this._plugins[name] = Array();
    }

    if (typeof this._plugins[name][p] === 'undefined') {
      this.load(name, p);
    }

    this._plugins[name][p].call(name, socket, command);
  }

};

Plugins.prototype.load = function(name, file) {
  this._plugins[name][file] = require(file);
};

module.exports = Plugins;
