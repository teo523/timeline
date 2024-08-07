import { GLCanvas, Transform } from "@ryohey/webgl-react"
import { observer } from "mobx-react-lite"
import { FC, useMemo, useRef } from "react"
import { matrixFromTranslation } from "../../../helpers/matrix"
import { useStores } from "../../../hooks/useStores"
import { Beats } from "../../GLNodes/Beats"
import { Cursor } from "../../GLNodes/Cursor"
import { Selection } from "../../GLNodes/Selection"
import { Lines } from "./Lines"
import { Notes2 } from "./Notes2"

export interface ArrangeViewCanvasProps {
  width: number
}

export const ArrangeViewCanvas2: FC<ArrangeViewCanvasProps> = observer(
  ({ width }) => {
    const rootStore = useStores()
    const tracks = rootStore.song2.tracks
    const {
      trackHeight,
      scrollLeft,
      scrollTop,
      rulerStore: { beats },
      cursorX,
      selectionRect,
    } = rootStore.arrangeViewStore2
    const ref = useRef<HTMLCanvasElement>(null)

    const scrollXMatrix = useMemo(
      () => matrixFromTranslation(-scrollLeft, 0),
      [scrollLeft],
    )

    const scrollYMatrix = useMemo(
      () => matrixFromTranslation(0, -scrollTop),
      [scrollLeft, scrollTop],
    )

    const scrollXYMatrix = useMemo(
      () => matrixFromTranslation(-scrollLeft, -scrollTop),
      [scrollLeft, scrollTop],
    )

    const height = trackHeight * tracks.length

    return (
      <GLCanvas
        ref={ref}
        style={{ pointerEvents: "none" }}
        width={width}
        height={height}
      >
        <Transform matrix={scrollYMatrix}>
          <Lines width={width} zIndex={0} />
        </Transform>
        <Transform matrix={scrollXMatrix}>
          <Beats height={height} beats={beats} zIndex={1} />
          <Cursor x={cursorX} height={height} zIndex={4} />
        </Transform>
        <Transform matrix={scrollXYMatrix}>
          <Notes2 zIndex={2} />
          <Selection rect={selectionRect} zIndex={3} />
        </Transform>
      </GLCanvas>
    )
  },
)
