function loadDbEntity(mid, realId)
{
    var thumbnailUrl = '../db/thumbnails/m' + realId + '_thumb.png'
    var featuresUrl = '../db/vectorfiles/m' + realId + '.json'

    var item = {
        mid: mid,
        thumbnailUrl: thumbnailUrl,
        featuresUrl: featuresUrl,
        features: undefined
    }

    $.getJSON(item.featuresUrl, function(data)
    {
        item.setFeatures(data.features)
    })
    .fail(function()
    {
        item.setFeatures(undefined)
    })

    return item
}

function compareEntity(dbEntity, param)
{
    var v1 = dbEntity.features
    var v2 = param.entity.features
    var vdiff = v1.map(function(v1item, idx) { return v2[idx] - v1item })
    var vdiffl2 = Math.sqrt(vdiff.reduce(function(acc, current) { return acc + current*current }))

    return vdiffl2 < param.threshold ? { dbEntity:dbEntity, diff:vdiffl2} : undefined
}

function entityView(dbItem)
{
    var viewElement = document.createElement('div')
        var img = document.createElement('img')
        var modelIndex = document.createElement('div')

    img.src = dbItem.thumbnailUrl
    img.alt = 'select'    
    img.draggable = false

    modelIndex.className = 'index'
    modelIndex.innerText = dbItem.mid

    viewElement.appendChild(img)
    viewElement.appendChild(modelIndex)
    return viewElement
}

function matchItemView(matchItem)
{
    var viewElement = entityView(matchItem.dbEntity)
        var diffActual = document.createElement('div')
        var diffMax = document.createElement('div')
        var diffVal = document.createElement('div')

    var maxDiffWidth = 100

    diffActual.style.backgroundColor = '#80CCE6'
    diffActual.style.height = 5
    diffActual.style.width = maxDiffWidth - matchItem.diff * 2
    diffActual.style.top = 23
    diffActual.style.left = 7
    diffActual.style.position = 'absolute'

    diffMax.style.backgroundColor = '#e8e8e8'
    diffMax.style.height = 5
    diffMax.style.width = maxDiffWidth
    diffMax.style.top = 23
    diffMax.style.left = 7
    diffMax.style.position = 'absolute'
    diffMax.style.boxShadow = '0 1px 1px rgba(0, 0, 0, 0.15) inset'

    diffVal.innerText = matchItem.diff.toFixed(1)
    diffVal.style.color = '#B1B1B1'
    diffVal.style.top = 21
    diffVal.style.left = 113
    diffVal.style.fontSize = 9
    diffVal.style.position = 'absolute'

    viewElement.appendChild(diffVal)
    viewElement.appendChild(diffMax)
    viewElement.appendChild(diffActual)
    return viewElement
}

function resultHeaderView()
{
}

function parameterView(dbItem)
{
    var queryParameter = document.createElement("div")
    var midCombo = comboBox()
    var threshhold = labeledSlider(10, 25, 17, '±', '', 0, 8)

    queryParameter.onvalid = undefined
    queryParameter.startQuery = undefined
    queryParameter.value = undefined
    queryParameter.setDisabled = function(d)
    {
        midCombo.disabled = d
        threshhold.setDisabled(d)
    }
    queryParameter.setValue = function(dbItem)
    {
        midCombo.setValue(dbItem)
    }
    queryParameter.value = function()
    {
        return {
            entity: midCombo.value,
            threshold: threshhold.value
        }
    }

    midCombo.id = 'midCombo'
    midCombo.style.position = 'relative'
    midCombo.style.float = 'left'
    midCombo.ondragover  = function(ev) { ev.preventDefault() }
    //midCombo.ondragenter = function(ev) { start.disabled = false }
    //midCombo.ondragleave = function(ev) { start.disabled = true }
    midCombo.itemViewFactory = entityViewPanel
    midCombo.onValueChanged = function() { queryParameter.onvalid() }    
    midCombo.ondrop = function drop(ev)
    {
        ev.preventDefault()
        mid = ev.dataTransfer.getData("text")
        queryParameter.setValue(app.db.data[mid])
        queryParameter.startQuery()
    }

    midCombo.setValue(dbItem ? dbItem:app.db.data[0], true)
    app.db.data.forEach(function(i) { midCombo.insertItem(i) })

    queryParameter.appendChild(midCombo)
    queryParameter.appendChild(threshhold)
    return queryParameter
}
