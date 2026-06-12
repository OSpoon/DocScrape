import { uiMarker } from '../constants'

export function Hint({ onExit }: { onExit: () => void }) {
  return (
    <div className="docscrape-hint-layer" {...{ [uiMarker]: '' }}>
      <div className="docscrape-hint">
        <span className="docscrape-hint-dot" />
        <span className="docscrape-hint-text">点击页面元素进行选择</span>
        <button className="docscrape-hint-exit" type="button" onClick={onExit}>
          退出
        </button>
      </div>
    </div>
  )
}
