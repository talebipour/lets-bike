import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { useMapEvents } from 'react-leaflet'
import { Icon } from 'leaflet'

const pathOptions = { color: 'lime' }

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
    this.setState({path: this.state.path.concat(latlng)})
  }

  render() {
    return (
      <MapContainer center={[35.713,51.396]} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler callback={(latlng) => this.addPoint(latlng)} />
        { this.state.path.length > 0 &&
          <Marker position={this.state.path[0]} icon={markerIcon('green')}>
            <Popup>Source Location</Popup>
          </Marker>
        }
        { this.state.path.length > 1 &&
          <Marker position={this.state.path[this.state.path.length - 1]} icon={markerIcon('red')}>
            <Popup>Destination Location</Popup>
          </Marker>
        }
        { this.state.path.length > 0 &&
          <Polyline pathOptions={pathOptions} positions={this.state.path} />
        }
      </MapContainer>
    )
  }
}

export default Map