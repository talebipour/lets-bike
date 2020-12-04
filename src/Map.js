import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet'
import { useMapEvents } from 'react-leaflet'
import { Icon } from 'leaflet'

const uphillColors = ['#00FF00', '#65FF00', '#CCFF00', '#FFCC00', '#FF6600', '#FF0000']
const downhillColors = ['#00FF00', '#00CC33', '#009966', '#006699', '#0033CC', '#0000FF']

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
    if (currentPath.length > 0) {
      const lastSegment = currentPath.last()
      if (currentPath[0].isComplete()) {
        const segment = new PathSegment(lastSegment.dst, lastSegment.dstElevation, latlng, this);

        currentPath.push(segment)
      } else {
        currentPath[0].setDestination(latlng)
      }
    } else {
      currentPath.push(new PathSegment(latlng, null, null, this))
    }
    this.setState({path: currentPath})
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

  render() {
    return (
      <MapContainer center={[35.713,51.396]} zoom={15} scrollWheelZoom={false}>
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
            (<Polyline pathOptions={segment.mapOptions()} positions={[segment.src, segment.dst]}>
              { segment.gradient !== null &&
              <Tooltip>Gradient: {segment.gradient.toFixed(2)}%</Tooltip>
              }
            </Polyline>)
            )
        }
      </MapContainer>
    )
  }
}


class PathSegment {

  constructor(src, srcElevation, dst, map) {
    this.src = src
    this.srcElevation = srcElevation
    this.map = map
    this.gradient = null
    this.setDestination(dst)

    if (srcElevation === null) {
      this.fetchElevation(src, elevation => this.srcElevation = elevation)
    }
  }

  setDestination(latlng) {
    this.dst = latlng
    this.dstElevation = null
    if (latlng) {
      this.fetchElevation(latlng, elevation => {
        this.dstElevation = elevation
      })
    }
  }

  isComplete() {
    return this.dst !== null
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
        if (this.srcElevation !== null && this.dstElevation !== null) {
          this.calculateGradient()
        }
        // Update react state
        this.map.setState(this.map.state)
      })
  }

  calculateGradient() {
    this.distance = this.src.distanceTo(this.dst)
    const elevationDiff = (this.dstElevation - this.srcElevation);
    const sin = elevationDiff / this.distance
    const cos = Math.sqrt(1 - Math.pow(sin, 2))
    this.gradient = sin * cos * 100
  }

  mapOptions() {
    var color = 'gray'
    if (this.gradient) {
      const maxGradient = this.map.props.maxGradient
      if (Math.abs(this.gradient) > maxGradient) {
        color = 'black'
      }
      const colorIndex = Math.ceil(Math.abs(this.gradient) / maxGradient * (uphillColors.length - 1))
      color = this.gradient > 0 ? uphillColors[colorIndex] : downhillColors[colorIndex]
    }
    return { color: color }
  }

  toString() {
    return `(${this.src},${this.srcElevation}) => ${this.dst},${this.dstElevation}`
  }
}


export default Map