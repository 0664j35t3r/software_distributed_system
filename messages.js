(function(exports)
{
    exports.clientIdMsg = function(cid)
    {
        var msg = {}
        msg.type = 'ClientId'
        msg.yourId = cid
        return msg
    }

    exports.reloadMsg = function()
    {
        return { type:'Reload' }
    }

    exports.networkInfoMsg = function(nodes)
    {
        var msg = {}
        msg.type = 'NetworkInfo'
        msg.nodes = nodes
        return msg
    }

//-------------------------------------------------------------------------------------------

    // Search job related messages.
    // These messages are intended to be sent over the 'Job' channel,
    // i.e. they should be wrapped in a channelMsg with a type of 'Job'.
    
    exports.searchMsg = function(param, range, id)
    {
        var msg = {}
        msg.type = 'Search'
        msg.param = param
        msg.range = range
        // STUDENT TODO: add more parameters if necessary
        msg.id = id
        
        msg.toString = function() { return msg.range.begin + '-' + msg.range.end }
        return msg
    }

    exports.searchResponseMsg = function(results, id, finished)
    {
        var msg = {}
        msg.type = 'Matches'
        // STUDENT TODO
        msg.results = results
        msg.id = id
        msg.finished = finished

        return msg
    }
    
    // STUDENT TODO: add more message types as necessary
    exports.searchProgressMsg = function(percent, id)
    {
        var msg = {}
        msg.type = 'Progress'
        msg.percent = percent
        msg.id = id

        return msg
    }

    exports.searchExceptionMsg = function(exception, id)
    {
        var msg = {}
        msg.type = 'Exception'
        msg.exception = exception
        msg.id = id

        return msg
    }

    exports.searchCancelMsg = function(id)
    {
        var msg = {}
        msg.type = 'Cancel'
        msg.id = id

        return msg
    }

//-------------------------------------------------------------------------------------------

    exports.channelMsg = function(type, msg)
    {
        var net = {}
        net.type = type
        net.payload = msg
        return net
    }
})
(typeof exports === 'undefined' ? this['messages']={} : exports)
