import styled from "@emotion/styled"
import { observer } from "mobx-react-lite"
import React, { FC, useCallback } from "react"
import { Slider } from "../../../components/Slider"
import { setTrackVolume2 } from "../../actions"
import { useStores } from "../../hooks/useStores"
import chordIcon from "../../images/timeBracket.svg"

const Container = styled.div`
  -webkit-appearance: none;
  padding: 0 0.75rem 0 0;
  border-right: 1px solid ${({ theme }) => theme.dividerColor};
  text-transform: none;
  width: 8rem;
  height: 2rem;
  overflow: hidden;
  white-space: nowrap;
  display: flex;
  align-items: center;

  &:hover {
    background: ${({ theme }) => theme.highlightColor};
  }

  svg {
    width: 2rem;
    fill: black;
  }
`

const VolumeIcon = styled(chordIcon)`
  width: 2rem;
  height: 2rem;
  color: ${({ theme }) => theme.secondaryTextColor};
`

const Monitor = styled.div`
  color: black;
  font-size: 0.5rem;
  align-items: center;
  margin: 0 0 0 0;
  padding: 0.3rem;
`

export interface VolumeSliderProps {
  trackId: number
}

const _TimeSlider: FC<VolumeSliderProps> = observer(({ trackId }) => {
  const rootStore = useStores()
  const {
    pianoRollStore: { currentVolume2 },
    reader,
  } = rootStore
  const volume = reader.timeRange ?? 500
  const onChange = useCallback(
    (value: number) => {
      setTrackVolume2(rootStore)(trackId, value)
    },
    [rootStore, trackId],
  )
  return (
    <Container>
      <VolumeIcon />
      <Monitor className="monitorText">{reader.timeRange + "ms"}</Monitor>

      <Slider
        value={volume}
        onChange={(value) => onChange(value)}
        max={1000}
        minStepsBetweenThumbs={10}
      />
    </Container>
  )
})

export const TimeSlider = React.memo(_TimeSlider)
