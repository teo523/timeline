import { findLast, isEqual } from "lodash"
import { observer } from "mobx-react-lite"
import React, { FC, MouseEventHandler, useCallback, useState } from "react"
import { BeatWithX } from "../../../common/helpers/mapBeats"
import { LoopSetting } from "../../../common/player"
import { Theme } from "../../../common/theme/Theme"
import { Layout } from "../../Constants"
import { setLoopBegin, setLoopEnd, updateTimeSignature } from "../../actions"
import { useContextMenu } from "../../hooks/useContextMenu"
import { useStores } from "../../hooks/useStores"
import { useTheme } from "../../hooks/useTheme"
import { RulerStore, TimeSignature } from "../../stores/RulerStore"
import DrawCanvas from "../DrawCanvas"
import { RulerContextMenu } from "./RulerContextMenu"
import { TimeSignatureDialog } from "./TimeSignatureDialog"

const textPadding = 2

function drawRuler(
  ctx: CanvasRenderingContext2D,
  height: number,
  beats: BeatWithX[],
  theme: Theme,
) {
  ctx.strokeStyle = theme.secondaryTextColor
  ctx.lineWidth = 1
  ctx.beginPath()

  // 密過ぎる時は省略する
  // Omit when it is too high
  const shouldOmit = beats.length > 1 && beats[1].x - beats[0].x <= 5

  beats.forEach(({ beat, measure, x }) => {
    const isTop = beat === 0

    if (isTop) {
      ctx.moveTo(x, height / 2)
      ctx.lineTo(x, height)
    } else if (!shouldOmit) {
      ctx.moveTo(x, height * 0.8)
      ctx.lineTo(x, height)
    }

    // 小節番号
    // War Number
    // 省略時は2つに1つ描画
    // Default 1 drawing one for two
    if (isTop && (!shouldOmit || measure % 2 === 0)) {
      ctx.textBaseline = "top"
      ctx.font = `12px ${theme.canvasFont}`
      ctx.fillStyle = theme.secondaryTextColor
      ctx.fillText(`${measure + 1}`, x + textPadding, textPadding)
    }
  })

  ctx.closePath()
  ctx.stroke()
}

function drawLoopPoints(
  ctx: CanvasRenderingContext2D,
  loop: LoopSetting,
  height: number,
  pixelsPerTick: number,
  theme: Theme,
) {
  const flagSize = 8
  ctx.lineWidth = 1
  ctx.fillStyle = loop.enabled ? theme.themeColor : theme.secondaryTextColor
  ctx.strokeStyle = loop.enabled ? theme.themeColor : theme.secondaryTextColor
  ctx.beginPath()

  const beginX = loop.begin * pixelsPerTick
  const endX = loop.end * pixelsPerTick

  //Draw loop begin marker
  if (loop.begin !== null) {
    const x = beginX
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)

    ctx.moveTo(x, 0)
    ctx.lineTo(x + flagSize, 0)
    ctx.lineTo(x, flagSize)

    //Add colour to ruler
    /*     if (loop.end !== null) {
      ctx.fillStyle = theme.themeColor
      ctx.strokeStyle = theme.secondaryTextColor
      const x2 = endX
      ctx.moveTo(x, 0)
      ctx.lineTo(x2, 0)
      ctx.lineTo(x2, height)
      ctx.lineTo(x, height)
      ctx.lineTo(x, 0)

    } */
  }

  //Draw loop end marker
  if (loop.end !== null) {
    const x = endX
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)

    ctx.moveTo(x, 0)
    ctx.lineTo(x - flagSize, 0)
    ctx.lineTo(x, flagSize)
  }

  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawChangeMode(
  ctx: CanvasRenderingContext2D,
  pixelsPerTick: number,
  height: number,
  theme: Theme,
  start: number[][],
  lastTick: number,
) {
  if (start.length > 0) {
    start.forEach((startPoint, index) => {
      if (start[index][1] == 0) {
        ctx.fillStyle = "#AAFF0022"
      } else {
        ctx.fillStyle = "#0000FF11"
      }
      if (start.length - 2 >= index) {
        ctx.beginPath()
        const x1 = start[index][0] * pixelsPerTick
        const x2 = start[index + 1][0] * pixelsPerTick
        // console.log("start: ", start)
        // console.log("x1: ", x1)
        // console.log("x2: ", x2)
        // console.log("lastTick:", lastTick)

        ctx.moveTo(x1, 0)
        ctx.lineTo(x2, 0)
        ctx.lineTo(x2, height / 2)
        ctx.lineTo(x1, height / 2)
        ctx.lineTo(x1, 0)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.beginPath()
        const x1 = start[index][0] * pixelsPerTick
        const x2 = lastTick * pixelsPerTick
        ctx.moveTo(x1, 0)
        ctx.lineTo(x2, 0)
        ctx.lineTo(x2, height / 2)
        ctx.lineTo(x1, height / 2)
        ctx.lineTo(x1, 0)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    })
  }
}

function drawVampSections(
  ctx: CanvasRenderingContext2D,
  pixelsPerTick: number,
  height: number,
  theme: Theme,
  start: number[],
  end: number[],
) {
  const flagSize = 8
  ctx.lineWidth = 1
  ctx.fillStyle = theme.themeColor
  ctx.strokeStyle = theme.secondaryTextColor
  ctx.beginPath()

  //Draw Vamp Flags
  if (start.length > 0) {
    start.forEach((startPoint, index) => {
      const x1 = startPoint * pixelsPerTick
      ctx.moveTo(x1, height / 2)
      ctx.lineTo(x1, height)

      ctx.moveTo(x1, height / 2)
      ctx.lineTo(x1 + flagSize, height / 2)
      ctx.lineTo(x1, height / 2 + flagSize)
    })
  }

  if (end.length > 0) {
    end.forEach((endPoint, index) => {
      const x2 = endPoint * pixelsPerTick
      ctx.moveTo(x2, height / 2)
      ctx.lineTo(x2, height)
      ctx.moveTo(x2, height / 2)
      ctx.lineTo(x2 - flagSize, height / 2)
      ctx.lineTo(x2, height / 2 + flagSize)
    })
  }

  ctx.fill()

  //Draw vamp sections

  if (start.length > 0) {
    ctx.fillStyle = "#AA00FF22"
    start.forEach((startPoint, index) => {
      if (end.length - 1 >= index) {
        const x1 = startPoint * pixelsPerTick
        const x2 = end[index] * pixelsPerTick
        ctx.moveTo(x1, height / 2)
        ctx.lineTo(x2, height / 2)
        ctx.lineTo(x2, height)
        ctx.lineTo(x1, height)
        ctx.lineTo(x1, height / 2)
      }
    })
  }

  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  flagSize: number,
) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width + flagSize, y)
  ctx.lineTo(x + width, y + height)
  ctx.lineTo(x, y + height)
  ctx.lineTo(x, y)
  ctx.closePath()
  ctx.fill()
}

function drawTimeSignatures(
  ctx: CanvasRenderingContext2D,
  height: number,
  events: TimeSignature[],
  pixelsPerTick: number,
  theme: Theme,
) {
  ctx.textBaseline = "bottom"
  ctx.font = `11px ${theme.canvasFont}`
  events.forEach((e) => {
    const x = e.tick * pixelsPerTick
    const text = `${e.numerator}/${e.denominator}`
    const size = ctx.measureText(text)
    const textHeight =
      size.actualBoundingBoxAscent + size.actualBoundingBoxDescent
    ctx.fillStyle = e.isSelected
      ? theme.themeColor
      : theme.secondaryBackgroundColor
    const flagHeight = textHeight + textPadding * 4
    drawFlag(
      ctx,
      x,
      height - flagHeight,
      size.width + textPadding * 2,
      flagHeight,
      textHeight,
    )
    ctx.fillStyle = theme.textColor
    ctx.fillText(text, x + textPadding, height - textPadding)
  })
}

export interface PianoRulerProps {
  rulerStore: RulerStore
  style?: React.CSSProperties
}

// null = closed
interface TimeSignatureDialogState {
  numerator: number
  denominator: number
}

const TIME_SIGNATURE_HIT_WIDTH = 20

const PianoRuler: FC<PianoRulerProps> = observer(({ rulerStore, style }) => {
  const rootStore = useStores()
  const theme = useTheme()
  const { onContextMenu, menuProps } = useContextMenu()
  const [timeSignatureDialogState, setTimeSignatureDialogState] =
    useState<TimeSignatureDialogState | null>(null)
  const [rightClickTick, setRightClickTick] = useState(0)
  const height = Layout.rulerHeight

  const { vampStarts, vampEnds, mode, song } = rootStore
  const {
    canvasWidth: width,
    transform: { pixelsPerTick },
    scrollLeft,
  } = rulerStore.parent
  const { beats, timeSignatures, quantizer } = rulerStore
  const {
    player,
    player: { loop },
  } = rootStore

  const timeSignatureHitTest = (tick: number) => {
    const widthTick = TIME_SIGNATURE_HIT_WIDTH / pixelsPerTick
    return findLast(
      timeSignatures,
      (e) => e.tick < tick && e.tick + widthTick >= tick,
    )
  }

  const onMouseDown: React.MouseEventHandler<HTMLCanvasElement> = useCallback(
    (e) => {
      const tick = rulerStore.getTick(e.nativeEvent.offsetX)
      const quantizedTick = quantizer.round(tick)
      const timeSignature = timeSignatureHitTest(tick)

      if (e.nativeEvent.ctrlKey) {
        setLoopBegin(rootStore)(quantizedTick)
      } else if (e.nativeEvent.altKey) {
        setLoopEnd(rootStore)(quantizedTick)
      } else {
        if (timeSignature !== undefined) {
          if (e.detail == 2) {
            setTimeSignatureDialogState(timeSignature)
          } else {
            rulerStore.selectedTimeSignatureEventIds = [timeSignature.id]
          }
        } else {
          rulerStore.selectedTimeSignatureEventIds = []
          player.position = quantizedTick
        }
      }
    },
    [rootStore, quantizer, player, scrollLeft, pixelsPerTick, timeSignatures],
  )

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(-scrollLeft + 0.5, 0)
      drawRuler(ctx, height, beats, theme)
      if (loop !== null) {
        drawLoopPoints(ctx, loop, height, pixelsPerTick, theme)
      }

      drawVampSections(ctx, pixelsPerTick, height, theme, vampStarts, vampEnds)
      drawChangeMode(
        ctx,
        pixelsPerTick,
        height,
        theme,
        mode,
        song.tracks[1].endOfTrack,
      )
      drawTimeSignatures(ctx, height, timeSignatures, pixelsPerTick, theme)
      ctx.restore()
    },
    [
      width,
      pixelsPerTick,
      scrollLeft,
      beats,
      timeSignatures,
      loop,
      vampStarts,
      vampEnds,
    ],
  )

  const closeOpenTimeSignatureDialog = useCallback(() => {
    setTimeSignatureDialogState(null)
  }, [])

  const okTimeSignatureDialog = useCallback(
    ({ numerator, denominator }: TimeSignatureDialogState) => {
      rulerStore.selectedTimeSignatureEventIds.forEach((id) => {
        updateTimeSignature(rootStore)(id, numerator, denominator)
      })
    },
    [],
  )

  const onContextMenuWrapper: MouseEventHandler = useCallback(
    (e) => {
      setRightClickTick(rulerStore.getQuantizedTick(e.nativeEvent.offsetX))
      onContextMenu(e)
    },
    [rulerStore],
  )

  return (
    <>
      <DrawCanvas
        draw={draw}
        width={width}
        height={height}
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenuWrapper}
        style={style}
      />
      <RulerContextMenu
        {...menuProps}
        rulerStore={rulerStore}
        tick={rightClickTick}
      />
      <TimeSignatureDialog
        open={timeSignatureDialogState != null}
        initialNumerator={timeSignatureDialogState?.numerator}
        initialDenominator={timeSignatureDialogState?.denominator}
        onClose={closeOpenTimeSignatureDialog}
        onClickOK={okTimeSignatureDialog}
      />
    </>
  )
})

function equals(props: PianoRulerProps, nextProps: PianoRulerProps) {
  return isEqual(props.style, nextProps.style)
}

export default React.memo(PianoRuler, equals)
