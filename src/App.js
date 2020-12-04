import {useState} from 'react'
import './App.css'
import Map from './Map'
import PathExporter from './PathExporter'


const gradientInputStyle = {width: '30px'}

function App() {
  const [maxGradient, setMaxGradient] = useState(2)

  return (
    <div>
      <label>
        Max Gradient: &nbsp;
        <input type="number" value={maxGradient} maxLength={2} style={gradientInputStyle}
               onChange={(event) => setMaxGradient(event.target.value)} />
      </label>
      &nbsp;
      <Map maxGradient={maxGradient} />
    </div>
  );
}

export default App;
