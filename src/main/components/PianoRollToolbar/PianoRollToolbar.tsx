import styled from "@emotion/styled"
import { observer } from "mobx-react-lite"
import { FC, useCallback, useState } from "react"
import Switch from "react-switch"
import { useStores } from "../../hooks/useStores"
import { AutoScrollButton } from "../Toolbar/AutoScrollButton"
import { Toolbar } from "../Toolbar/Toolbar"
import { EventListButton } from "./EventListButton"
import { PianoRollToolSelector } from "./PianoRollToolSelector"
import { VolumeSlider } from "./VolumeSlider"

const Container = styled.div`
  -webkit-appearance: none;
  padding: 0 0.75rem;
  border: 1px solid ${({ theme }) => theme.dividerColor};
  text-transform: none;
  width: 6rem;
  height: 2rem;
  overflow: hidden;
  white-space: nowrap;
  display: flex;
  align-items: center;
  border-radius: 4px;

  &:hover {
    background: ${({ theme }) => theme.highlightColor};
  }

  svg {
    width: 2.3rem;
    fill: black;
  }
  p {
    font-size: 0.5rem;
    padding: 0 0.5rem 0 0.5rem;
  }
`

// const VolumeIcon = styled(chordIcon)`
//   width: 2rem;
//   height: 2rem;
//   color: ${({ theme }) => theme.secondaryTextColor};
//   margin-right: 0.5rem;
// `

const Spacer = styled.div`
  width: 1rem;
`

const FlexibleSpacer = styled.div`
  flex-grow: 1;
`

export const PianoRollToolbar: FC = observer(() => {
  const { pianoRollStore, pianoRollStore2, reader } = useStores()

  let { directControl } = useStores()

  const {
    quantize,
    autoScroll,
    isQuantizeEnabled,
    selectedTrack,
    selectedTrackId,
  } = pianoRollStore

  const onClickAutoScroll = useCallback(() => {
    pianoRollStore.autoScroll = !pianoRollStore.autoScroll
    pianoRollStore2.autoScroll = !pianoRollStore2.autoScroll
  }, [pianoRollStore, pianoRollStore2])

  const onSelectQuantize = useCallback(
    (denominator: number) => {
      pianoRollStore.quantize = denominator
    },
    [pianoRollStore],
  )

  const [checked, setChecked] = useState(false)
  const handleChange = (nextChecked: boolean) => {
    setChecked(nextChecked)
    reader.autoMode = nextChecked
  }

  const onClickQuantizeSwitch = useCallback(() => {
    pianoRollStore.isQuantizeEnabled = !pianoRollStore.isQuantizeEnabled
  }, [pianoRollStore])

  if (selectedTrack === undefined) {
    return <></>
  }

  return (
    <Toolbar>
      {/* <TrackListMenuButton /> */}

      {/* <TrackNameInput /> */}

      <EventListButton />

      {/* <InstrumentButton />
      <InstrumentBrowser /> */}

      <Spacer />
      <VolumeSlider trackId={selectedTrackId} />
      <Spacer />
      <Container>
        <p>Direct </p>
        <Switch
          checked={checked}
          onChange={handleChange}
          onColor="#FFFFFF"
          onHandleColor="#000000"
          handleDiameter={12}
          uncheckedIcon={false}
          checkedIcon={false}
          height={2}
          width={20}
          className="react-switch"
          id="material-switch"
        />

        <p> Auto </p>
      </Container>
      {/* <PanSlider trackId={selectedTrackId} /> */}

      <FlexibleSpacer />

      <PianoRollToolSelector />

      {/* <QuantizeSelector
        value={quantize}
        enabled={isQuantizeEnabled}
        onSelect={onSelectQuantize}
        onClickSwitch={onClickQuantizeSwitch}
      /> */}

      <AutoScrollButton onClick={onClickAutoScroll} selected={autoScroll} />
    </Toolbar>
  )
})
