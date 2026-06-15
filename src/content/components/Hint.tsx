import { uiMarker } from '../constants'

export function Hint({ count, onExit }: { count: number, onExit: () => void }) {
  const text = count > 0 ? '继续点击页面元素添加' : '点击页面元素进行选择'

  return (
    <div className="docscrape-hint-layer" {...{ [uiMarker]: '' }}>
      <div className="docscrape-hint">
        <span className="docscrape-hint-dot" />
        <span className="docscrape-hint-text">{text}</span>
        <button className="docscrape-hint-exit" type="button" onClick={onExit}>
          退出
        </button>
      </div>
    </div>
  )
}
