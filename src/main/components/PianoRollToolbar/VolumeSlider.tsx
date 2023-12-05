import styled from "@emotion/styled"
import { observer } from "mobx-react-lite"
import React, { FC, useCallback } from "react"
import { Slider } from "../../../components/Slider"
import { setTrackVolume } from "../../actions"
import { useStores } from "../../hooks/useStores"
import chordIcon from "../../images/chordIcon.svg"

const Container = styled.div`
  -webkit-appearance: none;
  padding: 0 0.75rem;
  border: 1px solid ${({ theme }) => theme.dividerColor};
  text-transform: none;
  width: 8rem;
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
`

const VolumeIcon = styled(chordIcon)`
  width: 2rem;
  height: 2rem;
  color: ${({ theme }) => theme.secondaryTextColor};
  margin-right: 0.5rem;
`

const Monitor = styled.div`
  color: black;
  align-items: center;
  margin: 0 0 0 0;
  padding: 0.3rem;
`

export interface VolumeSliderProps {
  trackId: number
}

const _VolumeSlider: FC<VolumeSliderProps> = observer(({ trackId }) => {
  const rootStore = useStores()
  const {
    pianoRollStore: { currentVolume },
    reader,
  } = rootStore
  const volume = currentVolume ?? 50
  const onChange = useCallback(
    (value: number) => {
      setTrackVolume(rootStore)(trackId, value)
    },
    [rootStore, trackId],
  )
  return (
    <Container>
      <VolumeIcon />
      <Monitor className="monitorText">{reader.tolerance}</Monitor>

      <Slider
        value={volume}
        onChange={(value) => onChange(value)}
        max={100}
        minStepsBetweenThumbs={1}
      />
    </Container>
  )
})

export const VolumeSlider = React.memo(_VolumeSlider)
