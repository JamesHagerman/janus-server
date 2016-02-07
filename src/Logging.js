var npmlog = require('npmlog');
var args = require('optimist').argv; // TODO: Deprecated. Swap for minimist or yargs
var onFinished = require('finished');
var fs = require('fs');
var config = require(args.config || '../config.js');
var rootDirectory = __dirname.substr(0, __dirname.lastIndexOf('/') + 1);

// TODO: Most of this code should be put into a single object for readability:

function callingFile(index, err) {
  var old = Error.prepareStackTrace;

  Error.prepareStackTrace = function(_, stack) {
    return stack;
  };

  if (err === undefined) {
    err = {};
    Error.captureStackTrace(err);
  }
  callFrame = err.stack[index];

  Error.prepareStackTrace = old;
  return callFrame.getFileName().replace(rootDirectory, '') + ':' + callFrame.getLineNumber();
}

// TODO: We probably want all logic in one section of the file for readability
if (args.debug) {
  npmlog.enableColor();
} else {
  npmlog.stream = fs.createWriteStream('server.log', {
    'flags': 'a'
  });
  npmlog.stream.write('------------- Restart -----------------');

  // TODO: Useless switch statement:
  switch (config.logLevel) {
    case 'info':
      npmlog.level = 'info';
      break;
    case 'error':
      npmlog.level = 'error';
      break;
    case 'silent':
      npmlog.level = 'silent';
      break;
    default:
      npmlog.level = 'info';
  }
}

// TODO: ts is a poor method name:
function ts() {
  return new Date().toTimeString().substring(0, 8);
}

function log(level) {
  if (level === 'debug' && !args.debug) {
    return;
  }

  var msg = Array.prototype.slice.call(arguments, 1);
  npmlog.log.apply(npmlog, [level, ts() + ' ' + callingFile(2)].concat(msg));
}

process.on('uncaughtException', function(ex) {
  npmlog.log('error', ts() + ' ' + callingFile(0, ex), "Uncaught exception %s", ex.message);
  setTimeout(function() {
    process.exit(1);
  }, 10);
});

function httpLog(req, res, next) {
  var start = process.hrtime();

  onFinished(res, function() {
    var time = process.hrtime(start);
    time = (time[0] * 1e3) + (time[1] / 1e6);
    npmlog.log('http', req.path, '%d time: %d ms', res.statusCode, time);
  });
  next();
}


module.exports = {
  _log: npmlog,
  info: log.bind(null, 'info'),
  debug: log.bind(null, 'verbose'),
  warn: log.bind(null, 'warn'),
  fatal: log.bind(null, 'fatal'),
  error: log.bind(null, 'error'),
  http: httpLog
};
