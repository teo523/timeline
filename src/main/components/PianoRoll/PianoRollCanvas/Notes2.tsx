import Color from "color"
import { partition } from "lodash"
import { observer } from "mobx-react-lite"
import { FC } from "react"
import { trackColorToCSSColor } from "../../../../common/track/TrackColor"
import { colorToVec4 } from "../../../gl/color"
import { useStores } from "../../../hooks/useStores"
import { useTheme } from "../../../hooks/useTheme"
import { PianoNoteItem } from "../../../stores/PianoRollStore2"
import { NoteCircles } from "./NoteCircles"
import { NoteRectangles } from "./NoteRectangles"

export const Notes2: FC<{ zIndex: number }> = observer(({ zIndex }) => {
  const {
    pianoRollStore2: { notes, selectedTrack },
  } = useStores()
  const theme = useTheme()

  if (selectedTrack === undefined) {
    return <></>
  }

  const [drumNotes, normalNotes] = partition(notes, (n) => n.isDrum)
  const baseColor = Color(
    selectedTrack.color !== undefined
      ? trackColorToCSSColor(selectedTrack.color)
      : Color(theme.secondaryBackgroundColor).darken(0.9),
  )
  const borderColor = colorToVec4(
    Color(theme.secondaryBackgroundColor).lighten(0.1),
  )
  const selectedColor = colorToVec4(baseColor.lighten(0.7))
  const backgroundColor = Color(theme.themeColor).lighten(0.1)

  const colorize = (item: PianoNoteItem) => ({
    ...item,
    color: item.isSelected
      ? selectedColor
      : colorToVec4(baseColor.mix(backgroundColor, 1 - item.velocity / 127)),
  })

  return (
    <>
      <NoteCircles
        strokeColor={borderColor}
        rects={drumNotes.map(colorize)}
        zIndex={zIndex}
      />
      <NoteRectangles
        strokeColor={borderColor}
        rects={normalNotes.map(colorize)}
        zIndex={zIndex + 0.1}
      />
    </>
  )
})
