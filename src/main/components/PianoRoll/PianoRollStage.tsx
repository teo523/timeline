import styled from "@emotion/styled"
import { observer } from "mobx-react-lite"
import { FC } from "react"
import { Layout } from "../../Constants"
import { useStores } from "../../hooks/useStores"
import { useTheme } from "../../hooks/useTheme"
import CanvasPianoRuler from "./CanvasPianoRuler"
import PianoKeys from "./PianoKeys"
import { PianoRollCanvas } from "./PianoRollCanvas/PianoRollCanvas"
import { PianoRollCanvas2 } from "./PianoRollCanvas/PianoRollCanvas2"

export interface PianoRollStageProps {
  width: number
  height: number
  showRuler: boolean
}

const Container = styled.div`
  flexdirection: "row";
`

const ContentPosition = styled.div`
  position: absolute;
  left: ${Layout.keyWidth}px;
`

const RulerPosition = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  padding-left: ${Layout.keyWidth}px;
  height: ${Layout.rulerHeight}px;
`

const Separator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  padding-left: ${Layout.keyWidth}px;
  height: ${Layout.rulerHeight / 2}px;
  width: 100%;
`

const PianoKeyPosition = styled.div`
  position: absolute;
  left: 0;
  top: 0;
`

export const PianoRollStage: FC<PianoRollStageProps> = observer(
  ({ width, height, showRuler }) => {
    const { pianoRollStore } = useStores()
    const { scrollTop, transform } = pianoRollStore
    const showR = showRuler
    const theme = useTheme()

    // useEffect(()=>{
    //   console.log(scrollTop);
    // });

    if (showR) {
      return (
        <Container>
          <ContentPosition style={{ top: Layout.rulerHeight }}>
            <PianoRollCanvas
              width={width}
              height={height - Layout.rulerHeight}
              showRuler={true}
            />
          </ContentPosition>
          <PianoKeyPosition style={{ top: -scrollTop + Layout.rulerHeight }}>
            <PianoKeys
              keyHeight={transform.pixelsPerKey}
              numberOfKeys={transform.numberOfKeys}
            />
          </PianoKeyPosition>
          <RulerPosition
            style={{
              background: theme.backgroundColor,
              borderBottom: `1px solid ${theme.dividerColor}`,
            }}
          >
            <CanvasPianoRuler rulerStore={pianoRollStore.rulerStore} />
          </RulerPosition>
        </Container>
      )
    }

    return (
      <Container>
        <ContentPosition style={{ top: Layout.rulerHeight }}>
          <PianoRollCanvas2
            width={width}
            height={height - Layout.rulerHeight}
            showRuler={false}
          />
        </ContentPosition>
        <PianoKeyPosition style={{ top: -scrollTop }}>
          <PianoKeys
            keyHeight={transform.pixelsPerKey}
            numberOfKeys={transform.numberOfKeys}
          />
        </PianoKeyPosition>
        <Separator
          style={{
            background: theme.backgroundColor,
            borderBottom: `1px solid ${theme.dividerColor}`,
          }}
        ></Separator>
      </Container>
    )
  },
)
