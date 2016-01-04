var app = {}
app.clientId = undefined
app.wsUrl = 'ws://' + document.location.hostname + ':' + config.server.wsport
app.setClientId = function(yourId)
{
    app.clientId = yourId    
    view.setConnectionInfo('Connected as client ' + 'C' + Number(app.clientId).toSubscript())
}


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
    sim.log("print leck mi do")

    sim.log('app', 'log', '⟶', param)


    queryView.oncancelclick = function()
    {
        sim.log("print dsfdasfdasfafaf")
        sim.log('app', 'log', 'user clicked cancel')

    }

    // use sim.log instead of console.log to enable and disable
    // console messages acording to the ☍Network Panel
    sim.log('app', 'log', '⟶', param)

    /// use sim.pointOfFailure in order to simulate errors
    try
    {
        sim.pointOfFailure('u1', network.connection)
    }
    catch(e)
    {
        queryView.updateViewState('failed', e)
        throw e
    }

    queryView.setResultItems([{
        dbEntity:{
            mid: 7,
            thumbnailUrl:'../db/thumbnails/m7_thumb.png'
        },
        diff:9
    },
    {
        dbEntity:{
            mid: 7,
            thumbnailUrl:'../db/thumbnails/m7_thumb.png'
        },
        diff:9
    }])

    var first = 50;
    var last = 99;
    app.db.visitRange(first, last, function(entity, idx, isLast)
    {
        // the delay is implemented with a timer,
        // this function is called in a timer callback if delay is activated.
        // so catch exceptions here (never throw a exceptin to a timer callback)
        try {
            sim.log('own', 'log', 'visiting', idx, entity)
            queryView.updateViewState('running', 'Running local search on entity: ' + idx, idx)

            // After half of the work, simulate a "point of failure."
            // Depending on the configuration, sim.pointOfFailure might
            // close your connection, throw an exception, return 'stopWork', or
            // just do nothing.
            // THIS IS NECESSARY FOR THE TEST CASES TO WORK.
            if (idx >= (first + last) / 2)
                if(sim.pointOfFailure('atWork') === 'stopWork')
                    return 'abort';

            if (isLast)
                queryView.updateViewState('ok', 'we did something')
        } catch(e) {
            // Handle the exception hrrtr 
            return 'abort';
        }
    })

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
            sim.log("dfdsafdsfsadfdasfasfads")


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
        sim.log("======== app.networkInfo")


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
