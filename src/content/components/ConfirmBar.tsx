import { uiMarker } from '../constants'

export function ConfirmBar(props: {
  selector: string
  onReselect: () => void
  onConvert: () => void
}) {
  return (
    <div className="docscrape-dialog" {...{ [uiMarker]: '' }}>
      <div className="docscrape-dialog-bar">
        <div className="docscrape-dialog-summary">
          <span className="docscrape-dialog-icon">✓</span>
          <span className="docscrape-dialog-title">已选择</span>
          <code className="docscrape-dialog-selector">{props.selector}</code>
        </div>
        <div className="docscrape-dialog-actions">
          <button className="docscrape-secondary" type="button" onClick={props.onReselect}>
            重新选择
          </button>
          <button className="docscrape-primary" type="button" onClick={props.onConvert}>
            转换 Markdown
          </button>
        </div>
      </div>
    </div>
  )
}
