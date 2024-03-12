import styled from "@emotion/styled"
import useComponentSize from "@rehooks/component-size"
import { clamp } from "lodash"
import { observer } from "mobx-react-lite"
import { FC, useCallback, useRef } from "react"
import { Layout, WHEEL_SCROLL_RATE } from "../../Constants"
import { isTouchPadEvent } from "../../helpers/touchpad"
import { useStores } from "../../hooks/useStores"
import {
  HorizontalScaleScrollBar,
  VerticalScaleScrollBar,
} from "../inputs/ScaleScrollBar"
import { PianoRollStage } from "./PianoRollStage"
import { StyledSplitPane } from "./StyledSplitPane"

const Parent = styled.div`
  flex-grow: 1;
  background: ${({ theme }) => theme.backgroundColor};
  position: relative;
`

const Alpha = styled.div`
  flex-grow: 1;
  position: relative;
  overflow: hidden !important;

  .alphaContent {
    position: absolute;
    top: 0;
    left: 0;
  }
`

const Beta = styled.div`
  flex-grow: 1;
  position: relative;
  border-top: 1px solid ${({ theme }) => theme.dividerColor};
  height: calc(100% - 17px);
  overflow: hidden !important;
`

const PianoRollWrapper: FC = observer(() => {
  const { pianoRollStore: s } = useStores()
  const { pianoRollStore2: s2 } = useStores()

  const ref = useRef(null)
  const size = useComponentSize(ref)

  const alphaRef = useRef(null)
  const { height: alphaHeight = 0 } = useComponentSize(alphaRef)

  const onClickScaleUpHorizontal = useCallback(() => {
    s.scaleAroundPointX(0.2, Layout.keyWidth)
    s2.scaleAroundPointX(0.2, Layout.keyWidth)
  }, [s.scaleX, s])
  const onClickScaleDownHorizontal = useCallback(() => {
    s.scaleAroundPointX(-0.2, Layout.keyWidth)
    s2.scaleAroundPointX(-0.2, Layout.keyWidth)
  }, [s.scaleX, s])
  const onClickScaleResetHorizontal = useCallback(() => {
    s.scaleX = 1
    s2.scaleX = 1
  }, [s])

  const onClickScaleUpVertical = useCallback(() => {
    s.scaleAroundPointY(0.2, 0)
    s2.scaleAroundPointY(0.2, 0)
  }, [s.scaleY, s])
  const onClickScaleDownVertical = useCallback(() => {
    s.scaleAroundPointY(-0.2, 0)
    s2.scaleAroundPointY(-0.2, 0)
  }, [s.scaleY, s])
  const onClickScaleResetVertical = useCallback(() => {
    s.scaleY = 1
    s2.scaleY = 1
  }, [s])

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.shiftKey && (e.altKey || e.ctrlKey)) {
        // vertical zoom
        let scaleYDelta = isTouchPadEvent(e.nativeEvent)
          ? 0.02 * e.deltaY
          : 0.01 * e.deltaX
        scaleYDelta = clamp(scaleYDelta, -0.15, 0.15) // prevent acceleration to zoom too fast
        s.scaleAroundPointY(scaleYDelta, e.nativeEvent.offsetY)
        s2.scaleAroundPointY(scaleYDelta, e.nativeEvent.offsetY)
      } else if (e.altKey || e.ctrlKey) {
        // horizontal zoom
        const scaleFactor = isTouchPadEvent(e.nativeEvent) ? 0.01 : -0.01
        const scaleXDelta = clamp(e.deltaY * scaleFactor, -0.15, 0.15) // prevent acceleration to zoom too fast
        s.scaleAroundPointX(scaleXDelta, e.nativeEvent.offsetX)
        s2.scaleAroundPointX(scaleXDelta, e.nativeEvent.offsetX)
      } else {
        // scrolling
        const scaleFactor = isTouchPadEvent(e.nativeEvent)
          ? 1
          : s.transform.pixelsPerKey * WHEEL_SCROLL_RATE
        const deltaY = e.deltaY * scaleFactor
        s.scrollBy(-e.deltaX, -deltaY)
        s2.scrollBy(-e.deltaX, -deltaY)
      }
    },
    [s, s.transform, s2, s2.transform],
  )

  return (
    <Parent ref={ref}>
      <StyledSplitPane split="horizontal" minSize={50} defaultSize={"50%"}>
        <Alpha onWheel={onWheel} ref={alphaRef}>
          <PianoRollStage
            width={size.width}
            height={alphaHeight}
            showRuler={true}
          />
          <VerticalScaleScrollBar
            scrollOffset={s.scrollTop}
            contentLength={s.contentHeight}
            onScroll={useCallback((v: any) => s.setScrollTopInPixels(v), [s])}
            onClickScaleUp={onClickScaleUpVertical}
            onClickScaleDown={onClickScaleDownVertical}
            onClickScaleReset={onClickScaleResetVertical}
          />
        </Alpha>

        <Beta onWheel={onWheel}>
          <PianoRollStage
            width={size.width}
            height={alphaHeight}
            showRuler={false}
          />
          <VerticalScaleScrollBar
            scrollOffset={s2.scrollTop}
            contentLength={s2.contentHeight}
            onScroll={useCallback((v: any) => s2.setScrollTopInPixels(v), [s2])}
            onClickScaleUp={onClickScaleUpVertical}
            onClickScaleDown={onClickScaleDownVertical}
            onClickScaleReset={onClickScaleResetVertical}
          />
        </Beta>
      </StyledSplitPane>
      <HorizontalScaleScrollBar
        scrollOffset={s.scrollLeft}
        contentLength={s.contentWidth}
        onScroll={useCallback((v: any) => s.setScrollLeftInPixels(v), [s])}
        onClickScaleUp={onClickScaleUpHorizontal}
        onClickScaleDown={onClickScaleDownHorizontal}
        onClickScaleReset={onClickScaleResetHorizontal}
      />

      <HorizontalScaleScrollBar
        scrollOffset={s2.scrollLeft}
        contentLength={s2.contentWidth}
        onScroll={useCallback((v: any) => s2.setScrollLeftInPixels(v), [s2])}
        onClickScaleUp={onClickScaleUpHorizontal}
        onClickScaleDown={onClickScaleDownHorizontal}
        onClickScaleReset={onClickScaleResetHorizontal}
      />
    </Parent>
  )
})

export default PianoRollWrapper
