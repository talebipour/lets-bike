const { Component } = require("react");


class PathImportExport extends Component {

  dataUrl() {
    return "data:application/json," + encodeURIComponent(JSON.stringify(this.props.path))
  }

  importPath(event) {
    const file = event.target.files[0]
    const reader = new FileReader()
    reader.onloadend = (event) => {
      const json = event.target.result
      const path = JSON.parse(json);
      this.setState({importedPath: path})
      this.props.onImport(path)
    }
    reader.readAsText(file)
  }

  render() {
    return (
      <div>
        <a className="button" download="path.json" href={this.dataUrl()}>Export Path</a>
        &nbsp;
        <label className="import-path-button">
          Import Path:
          <input type="file" onChange={(event) => this.importPath(event)} />
        </label>
      </div>
    )
  }
}

export default PathImportExport