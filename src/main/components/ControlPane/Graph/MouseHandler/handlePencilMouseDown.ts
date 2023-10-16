//Creates MIDI CC events when pencil mouse down

import { IPoint, pointAdd, pointSub } from "../../../../../common/geometry"
import {
  ValueEventType,
  createValueEvent,
} from "../../../../../common/helpers/valueEvent"
import { ControlCoordTransform } from "../../../../../common/transform/ControlCoordTransform"
import {
  createEvent as createTrackEvent,
  updateValueEvents,
} from "../../../../actions"
import { pushHistory } from "../../../../actions/history"
import { getClientPos } from "../../../../helpers/mouseEvent"
import { observeDrag } from "../../../../helpers/observeDrag"
import RootStore from "../../../../stores/RootStore"

export const handlePencilMouseDown =
  (rootStore: RootStore) =>
  (
    e: MouseEvent,
    startPoint: IPoint,
    transform: ControlCoordTransform,
    type: ValueEventType,
  ) => {
    pushHistory(rootStore)()

    // Clear slection in pianoRoll and control pane
    rootStore.controlStore.selectedEventIds = []
    rootStore.controlStore.selection = null
    rootStore.pianoRollStore.selection = null
    rootStore.pianoRollStore.selectedNoteIds = []

    const startClientPos = getClientPos(e)
    const pos = transform.fromPosition(startPoint)

    //Creates CC event 
    const event = createValueEvent(type)(pos.value)

    // Add CC event
    createTrackEvent(rootStore)(event, pos.tick)

    //Im adding here an extra CC event, CC84, just for debugging purposes
    /* const event2 = createCCEvent(type)(pos.value)
    createTrackEvent(rootStore)(event2, pos.tick ) */


    let lastTick = pos.tick
    let lastValue = pos.value

    //Create more CC events if dragging the mouse in control pane
    observeDrag({
      onMouseMove: (e) => {
        const posPx = getClientPos(e)
        const deltaPx = pointSub(posPx, startClientPos)
        const local = pointAdd(startPoint, deltaPx)
        const value = Math.max(
          0,
          Math.min(transform.maxValue, transform.fromPosition(local).value),
        )
        const tick = transform.getTicks(local.x)

        updateValueEvents(type)(rootStore)(lastValue, value, lastTick, tick)

        lastTick = tick
        lastValue = value
      },
    }) 
  }
