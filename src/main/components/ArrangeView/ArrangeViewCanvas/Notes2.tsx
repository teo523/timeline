import { Rectangles } from "@ryohey/webgl-react"
import Color from "color"
import { observer } from "mobx-react-lite"
import { FC } from "react"
import { colorToVec4 } from "../../../gl/color"
import { useStores } from "../../../hooks/useStores"
import { useTheme } from "../../../hooks/useTheme"

export const Notes2: FC<{ zIndex: number }> = observer(({ zIndex }) => {
  const {
    arrangeViewStore2: { notes2 },
  } = useStores()
  const theme = useTheme()

  return (
    <Rectangles
      rects={notes2}
      color={colorToVec4(Color(theme.themeColor))}
      zIndex={zIndex}
    />
  )
})
