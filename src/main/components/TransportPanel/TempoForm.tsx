import styled from "@emotion/styled"
import { observer } from "mobx-react-lite"
import { FC } from "react"
import { DEFAULT_TEMPO } from "../../../common/player"
import { useStores } from "../../hooks/useStores"

const TempoInput = styled.input`
  background: transparent;
  -webkit-appearance: none;
  border: none;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
  width: 5em;
  text-align: center;
  outline: none;
  font-family: "Roboto Mono", monospace;
  font-size: 1rem;
  padding: 0 0 0 0;

  label {
    font-size: 0.2rem;
    color: ${({ theme }) => theme.secondaryTextColor};
  }

  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`

const ToolbarSeparator = styled.div`
  background: ${({ theme }) => theme.dividerColor};
  margin: 0.4em 1em;
  width: 1px;
  height: 1rem;
`

const TempoWrapper = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid transparent;
  padding-left: 0.75rem;
  border-radius: 0.25rem;

  label {
    font-size: 0.6rem;
    color: ${({ theme }) => theme.secondaryTextColor};
  }

  &:focus-within {
    border: 1px solid ${({ theme }) => theme.dividerColor};
    background: #ffffff14;
  }
`

export const TempoForm: FC = observer(() => {
  const {
    song,
    pianoRollStore: { playerTempo, currentTempo },
    player,
    reader,
  } = useStores()
  const tempo = currentTempo ?? DEFAULT_TEMPO
  const tempo2 = playerTempo ?? DEFAULT_TEMPO

  const changeTempo = (tempo: number) => {
    const fixedTempo = Math.max(1, Math.min(512, tempo))
    song.conductorTrack?.setTempo(fixedTempo, player.position)
    player.currentTempo = fixedTempo
  }

  const onKeyPressTempo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  const onChangeTempo = (e: React.ChangeEvent<HTMLInputElement>) =>
    changeTempo(parseFloat(e.target.value))

  return (
    <TempoWrapper>
      <label htmlFor="tempo-input">Target Tempo:</label>
      <TempoInput
        type="number"
        id="tempo-input"
        min={1}
        max={1000}
        value={Math.round(tempo * 100) / 100}
        step={1}
        onChange={onChangeTempo}
        onKeyPress={onKeyPressTempo}
      />

      <ToolbarSeparator />

      <label htmlFor="tempo-input2"> Player Tempo:</label>

      <TempoInput
        type="number"
        id="tempo-input2"
        min={1}
        max={1000}
        value={Math.round(tempo2 * 100) / 100}
        step={1}
        onChange={onChangeTempo}
        onKeyPress={onKeyPressTempo}
      />
    </TempoWrapper>
  )
})
