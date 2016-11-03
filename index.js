var webRTCSwarm
try {
  webRTCSwarm = require('webrtc-swarm')
} catch (e) {
  webRTCSwarm = null
}
var discoverySwarm = require('discovery-swarm')
var inherits = require('inherits')
var events = require('events')

module.exports = HybridSwarm

function HybridSwarm (opts) {
  if (!(this instanceof HybridSwarm)) return new HybridSwarm(opts)
  var self = this
  self.browser = null
  self.node = null
  self.connections = 0
  self.opts = opts
  if (typeof opts.wrtc === 'undefined') opts.wrtc = false
  else opts.wrtc = webRTCSwarm.WEBRTC_SUPPORT
  if (opts.wrtc) {
    if (!webRTCSwarm) throw new Error('You must install webrtc-swarm as a dependency first.')
    self._browser()
  }
  if (process.versions.node) self._node()
}

inherits(HybridSwarm, events.EventEmitter)

HybridSwarm.prototype.close = function (cb) {
  if (cb) this.once('close', cb)
  var self = this

  var swarms = [this.node, this.browser].filter(Boolean)
  swarms.forEach(function (swarm) {
    swarm.once('close', function () {
      var i = swarms.indexOf(swarm)
      if (i > -1) swarms.splice(i, 1)
      if (swarms.length === 0) self.emit('close')
    })
    process.nextTick(function () {
      swarm.close()
    })
  })
}

HybridSwarm.prototype._listening = function () {
}

HybridSwarm.prototype._connection = function () {
}

HybridSwarm.prototype.updateConnections = function () {
  var self = this
  var node = self.node ? self.node.connections.length : 0
  var browser = self.browser ? self.browser.peers.length : 0
  self.connections = node + browser
}

HybridSwarm.prototype._browser = function () {
  var self = this
  self.browser = webRTCSwarm(self.opts.signalhub, {wrtc: self.opts.wrtc})
  self.browser.on('peer', function (conn) {
    var opts = {type: 'webrtc-swarm'}
    self._connection(conn, opts)
    self.updateConnections()
    conn.on('close', function () { self.updateConnections() })
    self.emit('connection', conn, opts)
  })
  return self.browser
}

HybridSwarm.prototype._node = function () {
  var self = this

  var swarm = discoverySwarm(self.opts.discovery)

  swarm.on('connection', function (conn) {
    var opts = {type: 'discovery-swarm'}
    self._connection(conn, opts)
    self.updateConnections()
    conn.on('close', function () { self.updateConnections() })
    self.emit('connection', conn, opts)
  })

  swarm.on('listening', function () {
    self._listening()
  })

  swarm.once('error', function () {
    swarm.listen(0)
  })

  swarm.listen(self.opts.port || 3282)
  self.node = swarm
  return swarm
}
