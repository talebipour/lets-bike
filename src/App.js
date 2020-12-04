import {useState} from 'react'
import './App.css'
import Map from './Map'
import PathImportExport from './PathImportExport'


const gradientInputStyle = {width: '30px'}

function App() {
  const [maxGradient, setMaxGradient] = useState(2)

  return (
    <div>
      <div className="top-bar">
        <label>
          Max Gradient: &nbsp;
          <input type="number" value={maxGradient} maxLength={2} style={gradientInputStyle}
                onChange={(event) => setMaxGradient(event.target.value)} />
        </label>
      </div>
      <Map maxGradient={maxGradient} />
    </div>
  );
}

export default App;
