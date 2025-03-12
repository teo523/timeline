import { observer } from "mobx-react-lite"
import { FC } from "react"
import { songToMidi } from "../../../common/midi/midiConversion"
import { Localized } from "../../../components/Localized"
import { MenuDivider, MenuItem } from "../../../components/Menu"
import { createSong, saveSong } from "../../actions"
import {
  openFile,
  openFile2,
  openFile3,
  openFile4,
  openProject,
} from "../../actions/file"
import { useLocalization } from "../../hooks/useLocalization"
import { useStores } from "../../hooks/useStores"
import { useToast } from "../../hooks/useToast"

var ws = new WebSocket("ws://localhost:9001/")

export const FileMenu: FC<{ close: () => void }> = observer(({ close }) => {
  const rootStore = useStores()
  const toast = useToast()
  const localized = useLocalization()

  const onClickNew = () => {
    const { song } = rootStore
    close()
    if (
      song.isSaved ||
      confirm(localized("confirm-new", "Are you sure you want to continue?"))
    ) {
      createSong(rootStore)()
    }
  }

  const onClickOpenProject = async () => {
    const { song } = rootStore
    close()
    try {
      if (
        song.isSaved ||
        confirm(localized("confirm-open", "Are you sure you want to continue?"))
      ) {
        await openProject(rootStore)
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const onClickOpen = async () => {
    const { song } = rootStore
    close()
    try {
      if (
        song.isSaved ||
        confirm(localized("confirm-open", "Are you sure you want to continue?"))
      ) {
        await openFile(rootStore)
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const onClickOpen2 = async () => {
    const { song2 } = rootStore
    close()
    try {
      if (
        song2.isSaved ||
        confirm(localized("confirm-open", "Are you sure you want to continue?"))
      ) {
        await openFile2(rootStore)
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const onClickOpen3 = async () => {
    const { song3 } = rootStore
    close()
    try {
      if (
        song3.isSaved ||
        confirm(localized("confirm-open", "Are you sure you want to continue?"))
      ) {
        await openFile3(rootStore)
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  /*   const onClickSave = async () => {
    close()
    await saveFile(rootStore)
  }

  const onClickSaveAs = async () => {
    close()
    await saveFileAs(rootStore)
  } */

  // Send song through websockets when Download button is pressed
  const onClickDownload = () => {
    const { song } = rootStore
    close()
    saveSong(rootStore)()
    //ws.send(JSON.stringify(song.tracks[1].events[0]))
    var bytes = songToMidi(song)
    var arrBytes = Object.values(bytes)
    console.log(arrBytes)
    //ws.send(JSON.stringify(arrBytes))
  }

  const onClickSettings = async () => {
    const { song2 } = rootStore
    close()
    try {
      if (
        song2.isSaved ||
        confirm(localized("confirm-open", "Are you sure you want to continue?"))
      ) {
        await openFile4(rootStore)
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <>
      <MenuItem onClick={onClickNew}>
        <Localized default="New">new-song</Localized>
      </MenuItem>

      <MenuDivider />

      <MenuItem onClick={onClickOpen}>
        <Localized default="Open Performer Part">open-song</Localized>
      </MenuItem>

      <MenuItem onClick={onClickOpen2}>
        <Localized default="Open Kontakt Part">open-song2</Localized>
      </MenuItem>

      <MenuItem onClick={onClickOpen3}>
        <Localized default="Open Recorded Tempo">open-song3</Localized>
      </MenuItem>

      <MenuItem onClick={onClickSettings}>
        <Localized default="Upload Settings">download-midi</Localized>
      </MenuItem>

      <MenuItem onClick={onClickDownload}>
        <Localized default="Download Settings">download-midi</Localized>
      </MenuItem>

      <MenuItem onClick={onClickOpenProject}>
        <Localized default="Open Project">open-project</Localized>
      </MenuItem>
    </>
  )
})
