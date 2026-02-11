const EventEmitter = require('events');

// Create a single, shared instance of an EventEmitter
const eventEmitter = new EventEmitter();

module.exports = eventEmitter;
