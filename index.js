var webRTCSwarm = require('webrtc-swarm')
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
  if (opts.wrtc || webRTCSwarm.WEBRTC_SUPPORT) self._browser()
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

HybridSwarm.prototype._browser = function () {
  var self = this
  self.browser = webRTCSwarm(self.opts.signalhub, {wrtc: self.opts.wrtc})
  self.browser.on('peer', function (conn) {
    self.connections++
    var opts = {type: 'webrtc-swarm'}
    self._connection(conn, opts)
    conn.on('close', function () { self.connections-- })
    self.emit('connection', conn, opts)
  })
  return self.browser
}

HybridSwarm.prototype._node = function () {
  var self = this

  var swarm = discoverySwarm(self.opts.discovery)

  var opts = {type: 'discovery-swarm'}

  swarm.on('connection', function (peer) {
    self.connections++
    self._connection(peer, opts)
    peer.on('close', function () { self.connections-- })
    self.emit('connection', peer, opts)
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
