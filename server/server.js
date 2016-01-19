var config   = require('../config.js')
var sim      = require('../sim.js')
var messages = require('../messages.js')
var common   = require('../common.js')
var tools    = require('../tools.js')

var app = {}
app.clientId = 0
sim.config = config.server.defaultSimConfig
app.queryInfo = {}

// called by Net --------------------------------------------------------------------------

app.onNetworkStateChange = function(state, connection)
{
    var stateHandlers =
    {
        onConnected: function()
        {
            var msg = messages.clientIdMsg(connection.id)
            var channelMsg = messages.channelMsg('Ws', msg)
            connection.send(channelMsg)

            app.networkInfo.addNode(connection)            
        },

        onDisconnected: function()
        {
            var keys = Object.keys(app.queryInfo)
            for(var i = 0; i < keys.length; i++)
            {
                if(app.queryInfo[keys[i]] != undefined)
                {
                    var idx = app.queryInfo[keys[i]].clientId.indexOf(connection.id.toString())
                    if (idx != -1)
                    {
                        app.queryInfo[keys[i]].clientId.splice(idx, 1)
                        app.queryInfo[keys[i]].clients--
                        var id = keys[i].split('-')

                        if (id[0] != connection.id.toString())
                        {
                            var msg = messages.searchExceptionMsg('discon', keys[i])
                            var channelMsg = messages.channelMsg('Job', msg)
                            network.connections[id[0]].send(channelMsg)
                        }
                    }
                }
            }
            app.networkInfo.removeNode(connection)
        }
    }
    stateHandlers['on'+state]()
}
app.onMessage = function(c, parsed)
{
    var channelHandlers =
    {
        onWsMessage: function(c, parsed)
        { sim.log('app', 'log', '⟵', parsed)

            var messageHandlers =
            {
                onReload: function(c, parsed)
                {
                    var channelMsg = messages.channelMsg('Ws', parsed)
                    network.sendBroadcast(channelMsg)
                },

                onNetworkInfo: function(c, parsed)
                {
                    app.networkInfo.passiveChange(c, parsed)
                }

            }['on'+parsed.type](c, parsed)
        },

        onJobMessage: function(c, parsed)
        {
            // STUDENT TODO:
            var msgHandlers =
            {
                onSearch: function(c, parsed)
                {
                    console.log("SEARCH request received at Server!")
                    var query = {}
                    query.results = []
                    query.clients = 0
                    query.percent = 0
                    query.clientId = []
                    query.timeouts = {}
                    query.timeoutStat = {}
                    query.abort = parsed.param.config.cancelOnFatalEnabled
                    query.respTimeout = parsed.param.config.responseTimeout
                    query.respTimeoutEn = parsed.param.config.responseTimeoutEnabled
                    query.returnVal = 1
                    app.queryInfo[parsed.id] = query
                    var keys = Object.keys(network.connections)
                    for(var i = 0; i < network.connectionCount(); i++)
                    {
                        var range = app.networkInfo.nodes[keys[i]].range
                        var msg = messages.searchMsg(parsed.param, range, parsed.id)
                        var channelMsg = messages.channelMsg('Job', msg)
                        network.connections[keys[i]].send(channelMsg)
                        app.queryInfo[parsed.id].clients++
                        app.queryInfo[parsed.id].clientId.push(keys[i])

                        if(parsed.param.config.responseTimeoutEnabled)
                        {
                            app.queryInfo[parsed.id].timeouts[keys[i]] = initTimeout(keys[i], parsed.id)
                            app.queryInfo[parsed.id].timeoutStat[keys[i]] = 'ok'
                        }

                        console.log("SEARCH request forwarded!")
                    }
                },

                onMatches: function(c, parsed)
                {
                    console.log("MATCHES answer received at Server!")

                    if(app.queryInfo[parsed.id] == undefined || app.queryInfo[parsed.id].timeoutStat[c.id] == 'active')
                        return

                    if(app.queryInfo[parsed.id].respTimeoutEn && app.queryInfo[parsed.id].timeoutStat[c.id] == 'ok')
                    {
                        clearTimeout(app.queryInfo[parsed.id].timeouts[c.id])
                    }

                    if(parsed.finished == 1)
                    {
                        app.queryInfo[parsed.id].clients--
                    }
                    else
                    {
                        app.queryInfo[parsed.id].results.push(parsed.results.pop())
                        app.queryInfo[parsed.id].results.sort(function(a, b){return a.diff - b.diff})
                    }

                    if(app.queryInfo[parsed.id].clients == 0)
                    {
                        var msg = messages.searchResponseMsg(app.queryInfo[parsed.id].results, parsed.id, app.queryInfo[parsed.id].returnVal)
                        var channelMsg = messages.channelMsg('Job', msg)
                        var clientId = parsed.id.split('-')
                        network.connections[clientId[0]].send(channelMsg)

                        var keys = Object.keys(app.queryInfo[parsed.id].timeouts)
                        for(var i = 0; i < keys.length; i++)
                        {
                            clearTimeout(app.queryInfo[parsed.id].timeouts[keys[i]])
                        }
                        app.queryInfo[parsed.id] = undefined
                    }
                    else
                    {
                        var msg = messages.searchResponseMsg(app.queryInfo[parsed.id].results, parsed.id, 0)
                        var channelMsg = messages.channelMsg('Job', msg)
                        var clientId = parsed.id.split('-')
                        network.connections[clientId[0]].send(channelMsg)

                        if(app.queryInfo[parsed.id].respTimeoutEn && app.queryInfo[parsed.id].timeoutStat[c.id] == 'ok')
                        {
                            app.queryInfo[parsed.id].timeouts[c.id] = initTimeout(c.id, parsed.id)
                        }
                    }

                    console.log("MATCHES answer forwarded!")
                },

                onProgress: function(c, parsed)
                {
                    if(app.queryInfo[parsed.id] == undefined || app.queryInfo[parsed.id].timeoutStat[c.id] == 'active')
                        return

                    if(app.queryInfo[parsed.id].respTimeoutEn && app.queryInfo[parsed.id].timeoutStat[c.id] == 'ok')
                    {
                        clearTimeout(app.queryInfo[parsed.id].timeouts[c.id])
                    }

                    app.queryInfo[parsed.id].percent += parsed.percent
                    var msg = messages.searchProgressMsg(app.queryInfo[parsed.id].percent, parsed.id)
                    var channelMsg = messages.channelMsg('Job', msg)
                    var clientId = parsed.id.split('-')
                    network.connections[clientId[0]].send(channelMsg)

                    if(app.queryInfo[parsed.id].respTimeoutEn && app.queryInfo[parsed.id].timeoutStat[c.id] == 'ok')
                    {
                        app.queryInfo[parsed.id].timeouts[c.id] = initTimeout(c.id, parsed.id)
                    }
                },

                onException: function(c, parsed)
                {
                    if(app.queryInfo[parsed.id].respTimeoutEn && app.queryInfo[parsed.id].timeoutStat[c.id] == 'ok')
                    {
                        clearTimeout(app.queryInfo[parsed.id].timeouts[c.id])
                    }

                    if(parsed.exception == 'fatal' || parsed.exception == 'fatalb')
                    {
                        console.log("Fatal error received at Server!")
                        var msg = messages.searchExceptionMsg(parsed.exception, parsed.id)
                        var channelMsg = messages.channelMsg('Job', msg)
                        var clientId = parsed.id.split('-')
                        network.connections[clientId[0]].send(channelMsg)

                        if(app.queryInfo[parsed.id].abort)
                        {
                            var msg = messages.searchCancelMsg(parsed.id)
                            var channelMsg = messages.channelMsg('Job', msg)
                            for(var i = 0; i < app.queryInfo[parsed.id].clientId.length; i++)
                            {
                                network.connections[app.queryInfo[parsed.id].clientId[i]].send(channelMsg)
                            }

                            var keys = Object.keys(app.queryInfo[parsed.id].timeouts)
                            for(var i = 0; i < keys.length; i++)
                            {
                                clearTimeout(app.queryInfo[parsed.id].timeouts[keys[i]])
                            }
                            app.queryInfo[parsed.id] = undefined
                        }
                        else
                          app.queryInfo[parsed.id].clients--
                    }

                    if(parsed.exception == 'recoverable' || parsed.exception == 'recoverableb')
                    {
                        console.log("Recoverable error received at Server!")
                        var msg = messages.searchExceptionMsg(parsed.exception, parsed.id)
                        var channelMsg = messages.channelMsg('Job', msg)
                        var clientId = parsed.id.split('-')
                        network.connections[clientId[0]].send(channelMsg)
                        app.queryInfo[parsed.id].clients--
                    }
                },

                onCancel: function(c, parsed)
                {
                    var msg = messages.searchCancelMsg(parsed.id)
                    var channelMsg = messages.channelMsg('Job', msg)
                    for(var i = 0; i < app.queryInfo[parsed.id].clientId.length; i++)
                    {
                        network.connections[app.queryInfo[parsed.id].clientId[i]].send(channelMsg)
                    }

                    var keys = Object.keys(app.queryInfo[parsed.id].timeouts)
                    for(var i = 0; i < keys.length; i++)
                    {
                        clearTimeout(app.queryInfo[parsed.id].timeouts[keys[i]])
                    }
                    app.queryInfo[parsed.id] = undefined
                }

            }['on'+parsed.type](c, parsed)
        }

    }['on'+parsed.type+'Message'](c, parsed.payload)
}

//-------------------------------------------------------------------------------------------

initTimeout = function(keys, parsedId)
{
    var ret = setTimeout(function(id, jobId)
    {
        app.queryInfo[jobId].timeoutStat[id] = 'active'
        app.queryInfo[jobId].clients--
        app.queryInfo[jobId].returnVal = 2

        if(app.queryInfo[jobId].abort)
        {
            var msg = messages.searchCancelMsg(jobId)
            var channelMsg = messages.channelMsg('Job', msg)
            network.connections[id].send(channelMsg)
            var idx = app.queryInfo[jobId].clientId.indexOf(id)
            if (idx != -1) {
                app.queryInfo[jobId].clientId.splice(idx, 1)
            }
        }

    },app.queryInfo[parsedId].respTimeout, keys, parsedId);

    return ret
}

app.networkInfo = function()
{
    var netInfo = {}
    netInfo.nodes = {}
    netInfo.nodesCount = function() { return Object.keys(netInfo.nodes).length }
    netInfo.nodes[0] = {
        clientcount: 0,
        dbLen: config.dbsize,
        simconfig: sim.config
    }

    function updateCache(changedNodes)
    {
        function createNode()
        {
            var newNode = {}
            newNode.range = 'invalid'
            newNode.simconfig = config.client.defaultSimConfig
            return newNode
        }

        function updateRanges()
        {
            console.assert(network.connectionCount() === (netInfo.nodesCount() - 1))

            netInfo.nodes[0].clientcount = network.connectionCount()
            netInfo.nodes.forEach(function (idx, cid, node)
            {
                node.range = node.range ?
                             tools.rangeOfPart({ begin:0, end:config.dbsize }, netInfo.nodesCount() - 1, idx - 1) :
                             undefined
            })
        }

        changedNodes.forEach(function(idx, id, v)
        {
            if      (v === 'freshbeef') netInfo.nodes[id] = createNode()
            else if (v === 'deadbeef')  delete netInfo.nodes[id]
            else                        netInfo.nodes[id] = v
        })

        if (changedNodes[app.clientId])
            sim.config = changedNodes[app.clientId].simconfig

        updateRanges()
        console.log(netInfo.nodes)
    }

    netInfo.addNode = function(changedConnection)
    { sim.log('app', 'log', '+ node ' + changedConnection.id)

        var nodes = {}
        nodes[changedConnection.id] = 'freshbeef'
        updateCache(nodes)

        var msg = messages.networkInfoMsg(netInfo.nodes)
        var channelMsg = messages.channelMsg('Ws', msg)
        network.sendBroadcast(channelMsg)
    }

    netInfo.removeNode = function(changedConnection)
    { sim.log('app', 'log', '- node ' + changedConnection.id)

        var nodes = {}
        nodes[changedConnection.id] = 'deadbeef'
        updateCache(nodes)

        var msg = messages.networkInfoMsg(nodes)
        var channelMsg = messages.channelMsg('Ws', msg)
        network.sendBroadcast(channelMsg)
    }

    netInfo.passiveChange = function(c, parsed)
    { sim.log('app', 'log', '⟵', 'node content changed by node ' + c.id)

        updateCache(parsed.nodes)

        var receivers = Object.keys(network.connections).without([c.id.toString()])
        var channelMsg = messages.channelMsg('Ws', parsed)
        network.sendMulticast(receivers, channelMsg)
    }
    return netInfo
}()

//-------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------

var network = require('./network').network
network.onConnectionChanged = app.onNetworkStateChange
network.onMessage = app.onMessage
network.sim = sim

//-------------------------------------------------------------------------------------------

var connect = require('connect')
var serveStatic = require('serve-static')
connect().use(serveStatic('../')).listen(config.server.httpport)
