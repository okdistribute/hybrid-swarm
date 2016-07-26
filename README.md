# hybrid-swarm

Finds peers using client-side browser webrtc connections and node.js.

## Usage

```js
var hybrid = require('hybrid-swarm')


// see npmjs.org/webrtc-swarm
var signalhub = 'https://signalhub.mafintosh.com'

// see npmjs.org/discovery-swarm
var discovery = { ... }

var swarm = hybrid({
  signalhub: signalhub,
  discovery: discovery
})
swarm.on('connection', function (conn) {
  if (conn.type === 'webrtc-swarm') {
    console.log('connected to webrtc-swarm')
  }
  if (conn.type === 'discovery-swarm') {
    console.log('connected to discovery swarm')
  }
  console.log(swarm.hybrid.connections, 'total connections')
})
```
