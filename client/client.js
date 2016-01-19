var app = {}
app.clientId = undefined
app.wsUrl = 'ws://' + document.location.hostname + ':' + config.server.wsport
app.setClientId = function(yourId)
{
    app.clientId = yourId    
    view.setConnectionInfo('Connected as client ' + 'C' + Number(app.clientId).toSubscript())
}
app.activeQueries = {}
app.nextQueryId = 0
app.cancelQuery = {}
app.timeouts = {}
app.status = {}

// called by GUI --------------------------------------------------------------------------

app.init = function()
{
    app.db.load()
    view.loadAuthors()
    view.insertTab()
    view.networkInfo.onChanged = app.networkInfo.activeChange
    network.onConnectionChanged = app.onNetworkStateChange
    network.onMessage = app.onMessage
    network.connect(app.wsUrl)
}
app.reloadAll = function()
{
    var msg = messages.reloadMsg()
    var channelMsg = messages.channelMsg('Ws', msg)
    network.connection.send(channelMsg)
}
app.search = function(queryView, param)
{
    // STUDENT TODO: This function is called when the search button is clicked.
    // Start your distributed search here.
    // The code in this function is meant to provide you with examples on how
    // to use the various functions. Most of it does *not* belong here in your
    // solution.

    queryView.oncancelclick = function()
    {
        sim.log('app', 'log', 'user clicked cancel')

        if(param.config.cancelOnFatalEnabled)
        {
            var qView = Object.keys(app.activeQueries)
            for (var i = 0; i < qView.length; i++)
            {
                if (app.activeQueries[qView[i]] == queryView)
                {
                    var msg = messages.searchCancelMsg(qView[i])
                    var channelMsg = messages.channelMsg('Job', msg)
                    network.connection.send(channelMsg)
                    app.activeQueries[qView[i]] = undefined
                    clearTimeout(app.timeouts[qView[i]])
                }
            }
            queryView.updateViewState('failed', 'Canceled Search')
        }
    }

    // use sim.log instead of console.log to enable and disable
    // console messages acording to the ☍Network Panel
    sim.log('app', 'log', '⟶', param)

    var qId = app.clientId + '-' + app.nextQueryId++
    app.activeQueries[qId] = queryView
    var msg = messages.searchMsg(param, 0, qId)
    var channelMsg = messages.channelMsg('Job', msg)
    network.connection.send(channelMsg)

    app.status[qId] = 'running'
    queryView.updateViewState('running', 'Search is running: ', 0)

    app.timeouts[qId] = setTimeout(function()
    {
        var qView = Object.keys(app.activeQueries)
        for(var i = 0; i < qView.length; i++)
        {
            if(app.activeQueries[qView[i]] == queryView)
            {
                app.status[qView[i]] = 'failed'
                queryView.updateViewState('failed', 'Overall Timeout')

                if(param.config.cancelOnFatalEnabled)
                {
                    var msg = messages.searchCancelMsg(qView[i])
                    var channelMsg = messages.channelMsg('Job', msg)
                    network.connection.send(channelMsg)
                }

                app.activeQueries[qView[i]] = undefined
            }
        }

    }, param.config.overallTimeout);

}

// called by Net --------------------------------------------------------------------------

app.onNetworkStateChange = function(state, connection)
{
    var functionOfState =
    {
        onConnecting: function()
        {
            view.setConnectionInfo('Auto reconnect \u21c4')
        },

        onConnected: function()
        {
            view.setConnectionInfo('Connected')
        },

        onDisconnected: function()
        {
            view.setConnectionInfo('Auto reconnect')
            view.db.setRange()
            view.networkInfo.update('clear')
        }

    }['on'+state]()
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
                    location.reload(true)
                },

                onClientId: function(c, parsed)
                {
                    app.setClientId(parsed.yourId)
                },

                onNetworkInfo: function(c, parsed)
                {                    
                    app.networkInfo.passiveChange(c, parsed)
                }

            }['on'+parsed.type](c, parsed)
        },

        onJobMessage: function(c, parsed)
        {
            sim.log('app', 'log', '⟵', parsed)
            sim.pointOfFailure('onRequest', c)

            // STUDENT TODO:
            var msgHandlers =
            {
                onSearch: function(c, parsed)
                {
                    console.log("SEARCH request received at Client!")
                    app.cancelQuery[parsed.id] = 0
                    var first = parsed.range.begin
                    var last = parsed.range.end
                    var results = []
                    try{ app.db.visitRange(first, last, function(entity, idx, isLast)
                    {
                        // the delay is implemented with a timer,
                        // this function is called in a timer callback if delay is activated.
                        // so catch exceptions here (never throw a exceptin to a timer callback)
                        try {
                            sim.log('own', 'log', 'visiting', idx, entity)
                            // After half of the work, simulate a "point of failure."
                            // Depending on the configuration, sim.pointOfFailure might
                            // close your connection, throw an exception, return 'stopWork', or
                            // just do nothing.
                            // THIS IS NECESSARY FOR THE TEST CASES TO WORK.
                            if (idx >= (first + last) / 2)
                                if(sim.pointOfFailure('atWork') === 'stopWork')
                                    return 'abort';

                            if(app.cancelQuery[parsed.id] == 1)
                            {
                                return 'abort'
                            }

                            // Change the modulo value for different interval
                            if(((idx - first) % 1) == 0)
                            {
                                var msg = messages.searchProgressMsg(1, parsed.id)
                                var channelMsg = messages.channelMsg('Job', msg)
                                network.connection.send(channelMsg)
                            }

                            var ret = compareEntity(entity, parsed.param)
                            if(ret !== undefined)
                            {
                                results.push(ret)
                                var msg = messages.searchResponseMsg(results, parsed.id, 0)
                                var channelMsg = messages.channelMsg('Job', msg)
                                network.connection.send(channelMsg)
                            }

                            if (isLast)
                            {
                                var msg = messages.searchResponseMsg(results, parsed.id, 1)
                                var channelMsg = messages.channelMsg('Job', msg)
                                network.connection.send(channelMsg)
                            }

                        } catch(e) {
                            // Handle the exception here
                            console.log("Error occured at Work: " + e)
                            if(e.message == 'fatal')
                            {
                                var msg = messages.searchExceptionMsg('fatal', parsed.id)
                                var channelMsg = messages.channelMsg('Job', msg)
                                network.connection.send(channelMsg)
                                return 'abort';
                            }
                            if(e.message == 'recoverable')
                            {
                                var msg = messages.searchExceptionMsg('recoverable', parsed.id)
                                var channelMsg = messages.channelMsg('Job', msg)
                                network.connection.send(channelMsg)
                                return 'abort';
                            }
                        }
                    }) }
                    catch(e) {
                        console.log("Error occured befor Work: " + e)
                        if(e.message == 'fatal')
                        {
                            var msg = messages.searchExceptionMsg('fatalb', parsed.id)
                            var channelMsg = messages.channelMsg('Job', msg)
                            network.connection.send(channelMsg)
                            return 'abort';
                        }
                        if(e.message == 'recoverable')
                        {
                            var msg = messages.searchExceptionMsg('recoverableb', parsed.id)
                            var channelMsg = messages.channelMsg('Job', msg)
                            network.connection.send(channelMsg)
                            return 'abort';
                        }
                    }
                },

                onMatches: function(c, parsed)
                {
                    console.log("MATCHES answer received at Client!")

                    if(app.activeQueries[parsed.id] == undefined)
                        return

                    if(app.status[parsed.id] != 'failed2')
                        app.activeQueries[parsed.id].setResultItems(parsed.results)

                    if (parsed.finished == 1 && app.status[parsed.id] == 'failed1')
                    {
                        app.activeQueries[parsed.id].updateViewState('failed', 'Discon | Exception')
                        app.activeQueries[parsed.id] = undefined
                        clearTimeout(app.timeouts[parsed.id])
                    }

                    else if (parsed.finished == 1 && app.status[parsed.id] == 'failed2')
                    {
                        app.activeQueries[parsed.id] = undefined
                        clearTimeout(app.timeouts[parsed.id])
                    }

                    else if (parsed.finished == 1 && app.status[parsed.id] != 'failed')
                    {
                        app.activeQueries[parsed.id].updateViewState('ok', 'Search finished!')
                        app.activeQueries[parsed.id] = undefined
                        clearTimeout(app.timeouts[parsed.id])
                    }

                    else if (parsed.finished == 2 && app.status[parsed.id] != 'failed')
                    {
                        app.activeQueries[parsed.id].updateViewState('failed', 'Other Reason!')
                        app.activeQueries[parsed.id] = undefined
                        clearTimeout(app.timeouts[parsed.id])
                    }
                },

                onProgress: function(c, parsed)
                {
                    if(app.activeQueries[parsed.id] == undefined || app.status[parsed.id] == 'failed' || app.status[parsed.id] == 'failed2')
                        return

                    app.activeQueries[parsed.id].updateViewState('running', 'Search is running: ', parsed.percent)
                },

                onException: function(c, parsed)
                {
                    if(app.activeQueries[parsed.id] == undefined|| app.status[parsed.id] == 'failed')
                        return

                    clearTimeout(app.timeouts[parsed.id])
                    app.status[parsed.id] = 'failed'

                    if(parsed.exception == 'fatal')
                    {
                        app.status[parsed.id] = 'failed2'
                        app.activeQueries[parsed.id].updateViewState('failed', 'Fatal error at Work!')
                        console.log("Fatal error at Work received at Client!")
                    }

                    if(parsed.exception == 'recoverable')
                    {
                        app.status[parsed.id] = 'failed1'
                        //app.activeQueries[parsed.id].updateViewState('failed', 'Recoverable error at Work!')
                        console.log("Recoverable error at Work received at Client!")
                    }

                    if(parsed.exception == 'fatalb')
                    {
                        app.status[parsed.id] = 'failed2'
                        app.activeQueries[parsed.id].updateViewState('failed', 'Fatal error before Work!')
                        console.log("Fatal error beforew Work received at Client!")
                    }

                    if(parsed.exception == 'recoverableb')
                    {
                        app.status[parsed.id] = 'failed1'
                        //app.activeQueries[parsed.id].updateViewState('failed', 'Recoverable error before Work!')
                        console.log("Recoverable error before Work received at Client!")
                    }

                    if(parsed.exception == 'discon')
                    {
                        app.status[parsed.id] = 'failed1'
                        //app.activeQueries[parsed.id].updateViewState('failed', 'Client disconnected!')
                        console.log("Disconection received at Client!")
                    }
                },

                onCancel: function(c, parsed)
                {
                    console.log("----------------------Recieved Cancel!")
                    app.cancelQuery[parsed.id] = 1
                }

            }['on'+parsed.type](c, parsed)
        }

    }['on'+parsed.type+'Message'](c, parsed.payload)
}

// services -------------------------------------------------------------------------

//-----------------------------------------------------------------------------------------

app.db = function()
{
    var db = { data:undefined, pageNr:0, fetch:0 }
    db.begin = function() { return db.pageNr * config.dbsize }

    db.size    = function()    { return db.data.length }
    db.getItem = function(mid) { return db.data[mid]   }

    db.nextPage = function() { db.pageNr += 1; db.load() }
    db.prevPage = function() { db.pageNr -= 1; db.load() }

    db.load = function()
    {
        db.data = []
        view.db.clear()        
        var dbprogress = view.db.addWorkerView('db' + db.fetch++)

        for (var i = 0; i < config.dbsize; i++)
        {
            var realId = db.pageNr * config.dbsize + ~~((i%10)*10+(i/10)%10)

            var item = loadDbEntity(i, realId)
            item.setFeatures = function(f)
            {
                this.features = f

                if (!this.features)
                    view.db.setModelHeader(this.mid, 0, 'red')
                else
                    view.db.setModelHeader(this.mid, 0)

                if (++dbprogress.value >= config.dbsize)
                    view.db.removeWorkerView(dbprogress.id)
            }

            db.data.push(item)
            view.db.insertDbItem(item)
        }
    }

    db.visitRange = function(begin, end, visitor)
    {
        var count = end-begin
        var current = begin - 1

        if(sim.pointOfFailure('beforeWork') === 'stopWork')
            return

        if (begin < 0 || end < 0 || begin > db.size() || end > db.size() || begin > end)
            throw new Error('invalid range: ' + begin + '-' + end)

        sim.delayedSection(function()
        {
            if (current >= begin + count/2)
                if(sim.pointOfFailure('atWork') === 'stopWork')
                    return false;

            var isLast = ++current >= end
            var returnVal = visitor(app.db.data[current], current, isLast)

            view.db.setModelColor(current, 0, '#A5F7B8')
            view.db.setModelColor(current, config.client.highlightTime)
            return !isLast && (returnVal !== 'abort' || !returnVal)
        })
    }
    return db
}()

//-----------------------------------------------------------------------------------------

app.networkInfo = function()
{
    var netInfo = {}

    netInfo.activeChange = function(nodes)
    { sim.log('app', 'log', '⟶', nodes)

        if (nodes[app.clientId])
            sim.config = nodes[app.clientId].simconfig

        var msg = messages.networkInfoMsg(nodes)
        var channelMsg = messages.channelMsg('Ws', msg)
        network.connection.send(channelMsg)
    }

    netInfo.passiveChange = function(c, parsed)
    {
        if (parsed.nodes[app.clientId])
            view.db.setRange(parsed.nodes[app.clientId].range)

        if (parsed.nodes[app.clientId])
            sim.config = parsed.nodes[app.clientId].simconfig

        view.networkInfo.update(parsed)
    }
    return netInfo
}()

//-----------------------------------------------------------------------------------------
