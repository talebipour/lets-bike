import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet'
import { useMapEvents } from 'react-leaflet'
import { Icon, LatLng } from 'leaflet'
import PathImportExport from './PathImportExport';

const ascentColors = ['#00FF00', '#65FF00', '#CCFF00', '#FFCC00', '#FF6600', '#FF0000']
const descentColors = ['#00FF00', '#00CC33', '#009966', '#006699', '#0033CC', '#0000FF']

Array.prototype.last = function() {
  return this.length === 0 ? null : this[this.length - 1]
}

function ClickHandler(props) {
  useMapEvents({
    click: (event) => {
      console.log("Location clicked: {}", event.latlng)
      props.callback(event.latlng)
    }
  })
  return null
}

function markerIcon(color) {
  return new Icon({
    iconUrl: `/marker/${color}.png`,
    shadowUrl: '/marker/shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

class Map extends Component {
  state = {
    path: []
  }

  addPoint(latlng) {
    const currentPath = this.state.path;
    var segment = null
    if (currentPath.length > 0) {
      const lastSegment = currentPath.last()
      if (currentPath[0].isComplete()) {
        segment = new PathSegment(lastSegment.dst, lastSegment.dstElevation, latlng);
        currentPath.push(segment)
      } else {
        segment = currentPath[0]
        segment.dst = latlng
      }
    } else {
      segment = new PathSegment(latlng);
      currentPath.push(segment)
    }
    this.setState({path: currentPath})
    segment.completeData(() => this.setState(this.state))
  }

  removeLastPoint() {
    const currentPath = this.state.path;
    if (currentPath.length === 1 && currentPath.last().dst !== null) {
      currentPath.last().setDestination(null)
    } else {
      currentPath.pop()
    }
    this.setState({path: this.state.path})
  }

  importPath(pathData) {
    const path = pathData.map(segmentData => {
      const segment = Object.assign(new PathSegment(), segmentData)
      segment.src = new LatLng(segment.src.lat, segment.src.lng)
      segment.dst = new LatLng(segment.dst.lat, segment.dst.lng)
      return segment
    })
    this.setState({path: path})
  }

  totalDistance(filter = () => true) {
    return this.state.path.filter(filter)
                .map(segment => segment.distance).reduce((previous, current) => previous + current, 0)
  }

  render() {
    return (
      <div>
        <PathImportExport path={this.state.path} onImport={(data) => this.importPath(data)} />
        <MapContainer center={[35.713,51.396]} zoom={15} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler callback={(latlng) => this.addPoint(latlng)} />
          { this.state.path.length > 0 &&
            <Marker position={this.state.path[0].src} icon={markerIcon('green')}>
              {!this.state.path[0].isComplete() &&
                <Popup>Source Location
                    <br />
                    <input type="button" value="x" onClick={() => this.removeLastPoint()} />
                </Popup>
              }
            </Marker>
          }
          { this.state.path.length > 0 && this.state.path.last().isComplete() &&
            <Marker position={this.state.path.last().dst} icon={markerIcon('red')}>
              <Popup>Destination Location
                <br />
                <input type="button" value="x" onClick={() => this.removeLastPoint()} />
              </Popup>
            </Marker>
          }
          { this.state.path.map(segment => !segment.isComplete() ? null :
              (<Polyline pathOptions={segment.mapOptions(this.props.maxGradient)} positions={[segment.src, segment.dst]}>
                { segment.gradient !== null &&
                <Tooltip>Gradient: {segment.gradient.toFixed(2)}%</Tooltip>
                }
              </Polyline>)
              )
          }
        </MapContainer>
        <div>
          Total distance: {this.totalDistance().toFixed(1)}m
          <p />
          Total ascent: {this.totalDistance(segment => segment.gradient > 0.5).toFixed(1)}m
          <p />
          Total descent: {this.totalDistance(segment => segment.gradient < -0.5).toFixed(1)}m
        </div>
      </div>
    )
  }
}


class PathSegment {

  constructor(src = null, srcElevation = null, dst = null, dstElevation = null, gradient = null, distance = null) {
    this.src = src
    this.srcElevation = srcElevation
    this.dst = dst
    this.dstElevation = dstElevation
    this.gradient = gradient
    this.distance = distance
  }

  isComplete() {
    return this.dst !== null
  }

  completeData(updateCallback) {
    if (this.srcElevation === null && this.src !== null) {
      this.fetchElevation(this.src, elevation => {
        this.srcElevation = elevation
        if (this.srcElevation !== null && this.dstElevation !== null) {
          this.calculateGradient()
        }
        updateCallback()
      })
    }
    if (this.dstElevation === null && this.dst !== null) {
      this.fetchElevation(this.dst, elevation => {
        this.dstElevation = elevation
        if (this.srcElevation !== null && this.dstElevation !== null) {
          this.calculateGradient()
        }
        updateCallback()
      })
    }
  }

  fetchElevation(latlng, callback) {
    console.log("Fetching elevation of " + latlng)
    fetch(`/v1/test-dataset?locations=${latlng.lat},${latlng.lng}`)
      .then(
        (result) => result.json(),
        (error) => console.log("Fetching elevation failed: "  + error)
      )
      .then((result) => {
        if (!result) {
          console.log("Elevation result is empty")
          return
        }
        const elevation = result.results[0].elevation;
        callback(elevation)
        console.log(`Elevation of ${latlng} set to ${elevation}`)
      })
  }

  calculateGradient() {
    this.distance = this.src.distanceTo(this.dst)
    const elevationDiff = (this.dstElevation - this.srcElevation);
    const sin = elevationDiff / this.distance
    const cos = Math.sqrt(1 - Math.pow(sin, 2))
    this.gradient = sin * cos * 100
  }

  mapOptions(maxGradient) {
    var color = 'gray'
    if (this.gradient) {
      if (Math.abs(this.gradient) > maxGradient) {
        color = 'black'
      }
      const colorIndex = Math.ceil(Math.abs(this.gradient) / maxGradient * (ascentColors.length - 1))
      color = this.gradient > 0 ? ascentColors[colorIndex] : descentColors[colorIndex]
    }
    return { color: color }
  }

  toString() {
    return `(${this.src},${this.srcElevation}) => ${this.dst},${this.dstElevation}`
  }

}


export default Map