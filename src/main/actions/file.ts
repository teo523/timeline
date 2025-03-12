import { songFromMidi, songToMidi } from "../../common/midi/midiConversion"
import { writeFile } from "../services/fs-helper"
import RootStore from "../stores/RootStore"
import { setSong, setSong2, setSong3 } from "./song"

// URL parameter for automation purposes used in scripts/perf/index.js
// /edit?disableFileSystem=true

var fr = new FileReader()

export const disableFileSystem =
  new URL(window.location.href).searchParams.get("disableFileSystem") === "true"

export const hasFSAccess =
  ("chooseFileSystemEntries" in window || "showOpenFilePicker" in window) &&
  !disableFileSystem

export const openProject = async (rootStore: RootStore) => {
  try {
    const dirHandle = await window.showDirectoryPicker()
    const newFiles = []

    for await (const entry of dirHandle.values()) {
      if (
        entry.kind === "file" &&
        entry.name.toLowerCase().includes("performer")
      ) {
        const file = await entry.getFile()
        const song = await songFromFile(file)
        song.fileHandle = entry
        setSong(rootStore)(song)
      }
      if (
        entry.kind === "file" &&
        entry.name.toLowerCase().includes("kontakt")
      ) {
        const file = await entry.getFile()
        const song2 = await songFromFile(file)
        song2.fileHandle = entry
        setSong2(rootStore)(song2)
      }
      if (
        entry.kind === "file" &&
        entry.name.toLowerCase().includes("recorded")
      ) {
        const file = await entry.getFile()
        const song3 = await songFromFile(file)
        song3.fileHandle = entry
        setSong3(rootStore)(song3)
      }

      if (
        entry.kind === "file" &&
        entry.name.toLowerCase().includes("settings")
      ) {
        const file = await entry.getFile()
        const arr = await file.arrayBuffer()
        const arr2 = JSON.parse(new TextDecoder().decode(arr)) // const song3 = await songFromFile(file)
        rootStore.vampStarts = arr2.start
        rootStore.vampEnds = arr2.end
        rootStore.mode = arr2.mode
      }
    }
  } catch (error) {
    console.error("Error accessing folder:", error)
  }
}

export const openFile = async (rootStore: RootStore) => {
  let fileHandle: FileSystemFileHandle
  try {
    fileHandle = (
      await window.showOpenFilePicker({
        types: [
          {
            description: "MIDI file",
            accept: { "audio/midi": [".mid"] },
          },
        ],
      })
    )[0]
  } catch (ex) {
    if ((ex as Error).name === "AbortError") {
      return
    }
    const msg = "An error occured trying to open the file."
    console.error(msg, ex)
    alert(msg)
    return
  }
  const file = await fileHandle.getFile()
  const song = await songFromFile(file)
  const song2 = await songFromFile(file)
  song.fileHandle = fileHandle
  song2.fileHandle = fileHandle
  setSong(rootStore)(song)
}

export const openFile2 = async (rootStore: RootStore) => {
  let fileHandle: FileSystemFileHandle
  try {
    fileHandle = (
      await window.showOpenFilePicker({
        types: [
          {
            description: "MIDI file",
            accept: { "audio/midi": [".mid"] },
          },
        ],
      })
    )[0]
  } catch (ex) {
    if ((ex as Error).name === "AbortError") {
      return
    }
    const msg = "An error occured trying to open the file."
    console.error(msg, ex)
    alert(msg)
    return
  }
  const file = await fileHandle.getFile()
  const song2 = await songFromFile(file)
  song2.fileHandle = fileHandle
  setSong2(rootStore)(song2)
  console.log(fileHandle)
}

export const openFile3 = async (rootStore: RootStore) => {
  let fileHandle: FileSystemFileHandle
  try {
    fileHandle = (
      await window.showOpenFilePicker({
        types: [
          {
            description: "MIDI file",
            accept: { "audio/midi": [".mid"] },
          },
        ],
      })
    )[0]
  } catch (ex) {
    if ((ex as Error).name === "AbortError") {
      return
    }
    const msg = "An error occured trying to open the file."
    console.error(msg, ex)
    alert(msg)
    return
  }
  const file = await fileHandle.getFile()
  const song3 = await songFromFile(file)
  song3.fileHandle = fileHandle
  setSong3(rootStore)(song3)
  console.log(fileHandle)
}

export const openFile4 = async (rootStore: RootStore) => {
  let fileHandle: FileSystemFileHandle
  try {
    fileHandle = (
      await window.showOpenFilePicker({
        types: [
          {
            description: "Settings file",
            accept: { "	application/json": [".json"] },
          },
        ],
      })
    )[0]
  } catch (ex) {
    if ((ex as Error).name === "AbortError") {
      return
    }
    const msg = "An error occured trying to open the file."
    console.error(msg, ex)
    alert(msg)
    return
  }
  const file = await fileHandle.getFile()
  const arr = await file.arrayBuffer()
  console.log(arr)
  const arr2 = JSON.parse(new TextDecoder().decode(arr)) // const song3 = await songFromFile(file)
  // console.log(arr2)

  rootStore.vampStarts = arr2.start
  rootStore.vampEnds = arr2.end
  rootStore.mode = arr2.mode
  console.log(rootStore.mode)
}

export const songFromFile = async (file: File) => {
  const buf = await file.arrayBuffer()
  const song = songFromMidi(new Uint8Array(buf))
  if (song.name.length === 0) {
    // Use the file name without extension as the song title
    song.name = file.name.replace(/\.[^/.]+$/, "")
  }
  song.filepath = file.name
  song.isSaved = true
  return song
}

export const saveFile = async (rootStore: RootStore) => {
  const fileHandle = rootStore.song.fileHandle
  if (fileHandle === null) {
    await saveFileAs(rootStore)
    return
  }

  const data = songToMidi(rootStore.song).buffer
  try {
    await writeFile(fileHandle, data)
  } catch (e) {
    console.error(e)
    alert("unable to save file")
  }
}

export const saveFileAs = async ({ song }: RootStore) => {
  let fileHandle
  try {
    fileHandle = await window.showSaveFilePicker({
      types: [
        {
          description: "MIDI file",
          accept: { "audio/midi": [".mid"] },
        },
      ],
    })
  } catch (ex) {
    if ((ex as Error).name === "AbortError") {
      return
    }
    const msg = "An error occured trying to open the file."
    console.error(msg, ex)
    alert(msg)
    return
  }
  try {
    const data = songToMidi(song).buffer
    await writeFile(fileHandle, data)
    song.fileHandle = fileHandle
  } catch (ex) {
    const msg = "Unable to save file."
    console.error(msg, ex)
    alert(msg)
    return
  }
}
