// Creates the context Menu window for the ruler in pianoroll

import { observer } from "mobx-react-lite"
import React, { FC, useCallback, useState } from "react"
import { envString } from "../../../common/localize/envString"
import {
  ContextMenu,
  ContextMenuProps,
  ContextMenuHotKey as HotKey,
} from "../../../components/ContextMenu"
import { Localized } from "../../../components/Localized"
import { MenuItem } from "../../../components/Menu"
import {
  addTimeSignature,
  setLoopBegin,
  setLoopEnd,
  setVampEnd,
  setVampStart,
} from "../../actions"
import { useStores } from "../../hooks/useStores"
import { RulerStore } from "../../stores/RulerStore"
import { TimeSignatureDialog } from "./TimeSignatureDialog"

export interface RulerContextMenuProps extends ContextMenuProps {
  rulerStore: RulerStore
  tick: number
}

export const RulerContextMenu: FC<RulerContextMenuProps> = React.memo(
  observer(({ rulerStore, tick, ...props }) => {
    const { handleClose } = props
    const rootStore = useStores()
    const { song, player } = rootStore
    const [isOpenTimeSignatureDialog, setOpenTimeSignatureDialog] =
      useState(false)

    const isTimeSignatureSelected =
      rulerStore.selectedTimeSignatureEventIds.length > 0

    const onClickAddTimeSignature = useCallback(() => {
      setOpenTimeSignatureDialog(true)
      handleClose()
    }, [])

    const onClickRemoveTimeSignature = useCallback(() => {
      song.conductorTrack?.removeEvents(
        rulerStore.selectedTimeSignatureEventIds,
      )
      handleClose()
    }, [song])

    const onClickSetVampStart = useCallback(() => {
      setVampStart(rootStore)(tick)
      handleClose()
    }, [tick])

    const onClickSetVampEnd = useCallback(() => {
      setVampEnd(rootStore)(tick)
      handleClose()
    }, [tick])

    const onClickSetLoopStart = useCallback(() => {
      setLoopBegin(rootStore)(tick)
      handleClose()
    }, [tick])

    const onClickSetLoopEnd = useCallback(() => {
      setLoopEnd(rootStore)(tick)
      handleClose()
    }, [tick])

    const closeOpenTimeSignatureDialog = useCallback(() => {
      setOpenTimeSignatureDialog(false)
    }, [])

    return (
      <>
        <ContextMenu {...props}>
          <MenuItem onClick={onClickSetLoopStart}>
            <Localized default="Set Vamp Start">set-loop-start</Localized>
            <HotKey>{envString.cmdOrCtrl}+Click</HotKey>
          </MenuItem>
          <MenuItem onClick={onClickSetLoopEnd}>
            <Localized default="Set Vamp End">set-loop-end</Localized>
            <HotKey>Alt+Click</HotKey>
          </MenuItem>
          <MenuItem onClick={onClickAddTimeSignature}>
            <Localized default="Add Time Signature">
              add-time-signature
            </Localized>
          </MenuItem>
          <MenuItem onClick={onClickSetVampStart}>
            <Localized default="Add Vamp Start">add-vamp-start</Localized>
          </MenuItem>

          <MenuItem onClick={onClickSetVampEnd}>
            <Localized default="Add Vamp End">add-vamp-end</Localized>
          </MenuItem>

          <MenuItem
            onClick={onClickRemoveTimeSignature}
            disabled={!isTimeSignatureSelected}
          >
            <Localized default="Remove Time Signature">
              remove-time-signature
            </Localized>
          </MenuItem>
        </ContextMenu>
        <TimeSignatureDialog
          open={isOpenTimeSignatureDialog}
          onClose={closeOpenTimeSignatureDialog}
          onClickOK={({ numerator, denominator }) => {
            addTimeSignature(rootStore)(player.position, numerator, denominator)
          }}
        />
      </>
    )
  }),
)
