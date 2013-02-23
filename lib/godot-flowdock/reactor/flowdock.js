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
 *          username: "xxx",
 *          password: "xxx",
 *          flows: ["xx:zz"]
 *        })
 *    ]
 *  }).listen(1337);
 *
 *
 */

var utile       = require('utile'),
    path        = require('path'),
    flowdock    = require('flowdock');

godotPath       = path.dirname(require.resolve('godot'));
ReadWriteStream = require(godotPath + '/godot/common').ReadWriteStream;

//
// ### function Flowdock (options)
// #### @options {Object} Options for sending tweet message.
// ####   @options.username      {string} The consumer key.
// ####   @options.password      {string} The consumer secret.
// ####   @options.flows         {Object} The access token key.
// ####   @options.formatter     {Function} Alternative formatter.
//
// Constructor function for the Flowdock stream responsible for sending
// flow on data events.
// 
//
var Flowdock = module.exports = function Flowdock(options) {
  if (!options || !options.username || !options.flows || options.flows.length === 0) {
    throw new Error('options.username and options.flows are required');
  }

  ReadWriteStream.call(this);

  var self = this;

  this.username       = options.username;
  this.password       = options.password;
  this.flows          = options.flows;

  this.interval       = options.interval;
  this._last          = 0;

  this.format  = options.formatter || this.formatter;

  this.session = new flowdock.Session(this.username, this.password);

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

  self._last = new Date();
  
  var message = this.format(data);
  self.flows.forEach(function (flow) {
    self.session.message(flow, message, data.tags);
  });

  return self.emit('data', data);
}

Flowdock.prototype.formatter = function (data) {
  var message = Object.keys(data).map(function(x) {
    return [x, data[x]].join(': ');
  }).join(',');
  return message;
}
