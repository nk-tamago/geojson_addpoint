if(process.argv.length !== 3 ){
    console.error("アプリケーション設定ファイルが必要")
    return
}

const fs = require('fs')
const turf = require('turf')
const turfmeta = require('@turf/meta')

const appConfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
//const appConfg = require(process.argv[2])

function counter() {
    let count = 0
    return {
        increment :function() {
            ++count
        },
        value : function(){
            return count
        }
    }
}


function writeGeoJson(writeFilePass, json){

    fs.writeFileSync(writeFilePass,JSON.stringify(json,null,2),'utf8')
}


function getFileName( path ){
    return path.split('\\').pop()
}

function newAddPointCoordinates(coordinates, speed){
    let line = turf.lineString(coordinates)
    let travelDistance = speed / 3600.0

    let newPointList = []

    // セグメント単位で回す理由は元の補間点を生かすため
    turfmeta.segmentEach(line, (currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) => {
        let segmentDistance = turf.lineDistance(currentSegment,'kilometers')
        for( let i=0 ; i<segmentDistance ; i=i+travelDistance){
            let p = turf.along(currentSegment,i,'kilometers')
            newPointList.push(p.geometry.coordinates)
        }
      })
    
    newPointList.push(line.geometry.coordinates[line.geometry.coordinates.length-1])
//    let newLine = turf.lineString(newPointList)
    return newPointList
//    console.log(JSON.stringify(newLine))
}

function newAddPointFeature( feature, speed ){
    let newFeature = undefined

    switch(feature.geometry.type){
        case "LineString":
            newFeature = turf.lineString(newAddPointCoordinates(feature.geometry.coordinates, speed))
            break 
        case "Polygon":
            let ring = []
            ring.push(newAddPointCoordinates(feature.geometry.coordinates[0], speed))
            newFeature = turf.polygon(ring)
            break 
        default:
            newFeature = []
            break 
    }

    return newFeature
}

const runTarget = async (targetInfo, wtitepath) => {
    let writeFilePass = wtitepath + "\\" + targetInfo.outfile

    let geojson = JSON.parse(fs.readFileSync(targetInfo.targetpath, 'utf8'));
//    let geojson = require(targetInfo.targetpath)

    let newFeatures = geojson.features.map( (feature) => {
        return newAddPointFeature( feature, targetInfo.speed )
    })

    let newCollection = turf.featureCollection(newFeatures)

    //    console.log(collection)

    writeGeoJson(writeFilePass, newCollection)
    console.log(writeFilePass)

    return
}

const main = async (appConfg) => {
    for( let target of appConfg.targets){
        await runTarget(target, appConfg.writepath)
    }
}

main(appConfg)
