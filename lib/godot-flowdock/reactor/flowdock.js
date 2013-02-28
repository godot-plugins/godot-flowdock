/*
 * flowdock.js: Stream responsible for sending flow on data events.
 *
 * @obazoud
 *
 * Configuration sample:
 *
 *  godot.createServer({
 *    type: 'tcp',
 *    reactors: [
 *      godot.reactor()
 *        .flowdock({
 *          nick: "xxx",
 *          token: "xxx"
 *        })
 *    ]
 *  }).listen(1337);
 *
 *
 */

var utile       = require('utile'),
    path        = require('path')
    https       = require('https');

godotPath       = path.dirname(require.resolve('godot'));
ReadWriteStream = require(godotPath + '/godot/common').ReadWriteStream;

//
// ### function Flowdock (options)
// #### @options {Object} Options for sending tweet message.
// ####   @options.token         {string} The flow API token. See https://www.flowdock.com/api/chat
// ####   @options.nick          {Object} Your nick.
// ####   @options.formatter     {Function} Alternative formatter.
//
// Constructor function for the Flowdock stream responsible for sending
// flow on data events.
// 
//
var Flowdock = module.exports = function Flowdock(options) {
  if (!options || !options.token || !options.nick) {
    throw new Error('options.token and options.nick are required');
  }

  ReadWriteStream.call(this);

  var self = this;

  this.token          = options.token;
  this.nick           = options.nick;

  this.interval       = options.interval;
  this._last          = 0;

  this.format  = options.formatter || this.formatter;
};

//
// Inherit from ReadWriteStream.
//
utile.inherits(Flowdock, ReadWriteStream);

//
// ### function write (data)
// #### @data {Object} JSON to send flow message
// Sends message with the specified `data`.
//
Flowdock.prototype.write = function (data) {
  var self = this;

  //
  // Return immediately if we have sent a message
  // in a time period less than `this.interval`.
  //
  if (this.interval && this._last
      && ((new Date()) - this._last) <= this.interval) {
    return;
  }

  self.send(data, function (err) {
  self._last = new Date();
  data.time = new Date();
    return err
      ? self.emit('error', err)
      : self.emit('data', data);
  });
}

Flowdock.prototype.send = function(data, callback) {
  var self = this;

  var dataToSend = {
    content: this.format(data),
    external_user_name: self.nick,
    tags: data.tags
  };

  var request = https.request({
    hostname: 'api.flowdock.com',
    path: utile.format("/v1/messages/chat/%s", this.token),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, function(response) {
    if (response.statusCode == 200) {
      var body = '';
      response.on('data', function(chunk) {
        body += chunk;
      });
      response.on('end', function () {
        callback();
      });
    } else {
      callback("Status code " + response.statusCode);
    }
  }).on('error', function(error) {
    callback(err);
  });
  request.write(JSON.stringify(dataToSend), 'utf8');
  request.end();
}

Flowdock.prototype.formatter = function (data) {
  var message = Object.keys(data).map(function(x) {
    return [x, data[x]].join(': ');
  }).join(',');
  return message;
}
