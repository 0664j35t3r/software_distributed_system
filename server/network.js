var config   = require('../config.js')
var messages = require('../messages.js')
var WebSocketServer = require('ws').Server

var network = {}
network.onMessage = undefined
network.onConnectionChanged = undefined
network.connections = {}
network.nextFreeConnectionId = 1
network.connectionCount = function() { return Object.keys(network.connections).length }
network.sendMulticast = function(receivers, msg)
{
    receivers.forEach(function (cid)
    {
        network.connections[cid].send(msg)
    })
}
network.sendBroadcast = function(msg)
{
    network.connections.forEach(function (idx, cid, conn)
    {
        try
        {
            conn.send(msg)
        }
        catch(e)
        {
        }
    })
}
network.wss = new WebSocketServer({ port:config.server.wsport })
network.wss.on('error', function(err) { console.error('WebSocketServer error: ' + err) })
network.wss.on('connection', function (ws)
{
    var connection = {}
    connection.id = network.nextFreeConnectionId++    
    connection.close = function() { ws.close() }
    connection.send = function(msg)
    {        
        var data = JSON.stringify(msg, null, 4)
        try
        {
            ws.send(data)
            network.sim.log('net', 'log', '⟶', connection.id, msg)            
        }
        catch(e)
        {
            ws.close()
            throw e
        }
    }
    network.connections[connection.id] = connection    
    network.onConnectionChanged('Connected', connection)

    ws.on('message', function onMessage(msg)
    {
        try
        {
            var parsed = JSON.parse(msg)
            network.sim.log('net', 'log', '⟵', connection.id, parsed)
            network.onMessage(connection, parsed)            
        }
        catch(e)
        {
            console.error(e.stack)
        }
    })
    ws.on('close', function onClose(code, msg)
    {
        delete network.connections[connection.id]
        network.onConnectionChanged('Disconnected', connection)
    })
    ws.on('error', function onError(err)
    {        
        delete network.connections[connection.id]
        network.onConnectionChanged('Disconnected', connection)
    })    
})

exports.network = network
