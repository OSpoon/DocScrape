import { ConfirmBar } from './components/ConfirmBar'
import { Hint } from './components/Hint'
import { useSelection } from './hooks/useSelection'

export default function ContentApp() {
  const { ui, controllerRef } = useSelection()

  return (
    <>
      {ui.mode === 'picking' && (
        <Hint onExit={() => controllerRef.current?.exitSelection()} />
      )}
      {ui.mode === 'selected' && (
        <ConfirmBar
          selector={ui.selector}
          onReselect={() => controllerRef.current?.resetSelectionForAnotherPick()}
          onConvert={() => controllerRef.current?.convertSelected()}
        />
      )}
    </>
  )
}
