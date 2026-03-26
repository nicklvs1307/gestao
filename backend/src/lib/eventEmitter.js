const EventEmitter = require('events');

// Create a single, shared instance of an EventEmitter
const eventEmitter = new EventEmitter();

// Increase max listeners to prevent warnings with SSE connections
eventEmitter.setMaxListeners(50);

module.exports = eventEmitter;
