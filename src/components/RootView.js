import ReactDOM from "react-dom"
import React, { Component } from "react"
import SplitPane  from "react-split-pane"
import { Helmet } from "react-helmet"

import Song from "../model/Song"
import Config from "../Config"
import Popup from "./Popup"

import TrackList from "./TrackList"
import Toolbar from "./MainToolbar"
import InstrumentBrowser from "./InstrumentBrowser"
import PianoRoll from "./PianoRoll/PianoRoll"

import {
  getGMMapIndexes,
  getGMMapProgramNumber
} from "../midi/GM.js"

import "./Resizer.css"
import "./RootView.css"

import TempoGraph from "./TempoGraph/TempoGraph"

const { remote } = window.require("electron")
const { Menu, dialog } = remote

function Pane(props) {
  return <div style={{position: "relative", height: "100%"}}>
    <SplitPane {...props} />
  </div>
}

export default class RootView extends Component {
  constructor(props) {
    super(props)

    this.state = {
      pianoRollMouseMode: 0,
      pianoRollScaleX: 1,
      pianoRollScaleY: 1,
      pianoRollAutoScroll: true,
      quantize: props.app.quantizer.denominator
    }
  }

  get selectedTrack() {
    return this.props.song && this.props.song.selectedTrack
  }

  componentDidMount() {
    this.initKeyboardShortcut()
  }

  initKeyboardShortcut() {
    document.onkeydown = e => {
      if (e.target !== document.body) {
        return
      }
      switch(e.keyCode) {
        case 32: {
          const { player } = this.props.app
          if (player.isPlaying) {
            player.stop()
          } else {
            player.play()
          }
          e.preventDefault()
          break
        }
        default: break
      }
    }
  }

  render() {
    const { props, state } = this
    const { app } = props
    const { song, player, quantizer, trackMute } = app
    const { selectedTrack, selectedTrackId } = song

    const onClickKey = () => {

    }

    const onClickPencil = () => {
      this.setState({pianoRollMouseMode: 0})
    }

    const onClickSelection = () => {
      this.setState({pianoRollMouseMode: 1})
    }

    const onChangeTool = () => {
      this.setState({
        pianoRollMouseMode: state.pianoRollMouseMode === 0 ? 1 : 0
      })
    }

    const onClickScaleUp = () => {
      this.setState({
        pianoRollScaleX: state.pianoRollScaleX + 0.1
      })
    }

    const onClickScaleDown = () => {
      this.setState({
        pianoRollScaleX: Math.max(0.05, state.pianoRollScaleX - 0.1),
      })
    }

    const onSelectQuantize = e => {
      dispatch("SET_QUANTIZE_DENOMINATOR", { denominator: e.denominator })
      this.setState({ quantize: e.denominator })
    }

    const onClickAutoScroll = () => {
      this.setState({
        pianoRollAutoScroll: !state.pianoRollAutoScroll
      })
    }

    const onClickTrackInstrument = trackId => {
      const track = song.getTrack(trackId)
      const popup = new Popup()
      popup.show()

      const programNumber = track.programNumber
      const ids = getGMMapIndexes(programNumber)

      ReactDOM.render(<InstrumentBrowser
        selectedCategoryId={ids[0]}
        selectedInstrumentId={ids[1]}

        onClickCancel={() => {
          popup.close()
        }}

        onClickOK={(e) => {
          const programNumber = getGMMapProgramNumber(e.categoryId, e.instrumentId)
          dispatch("SET_TRACK_INSTRUMENT", { trackId, programNumber })
          popup.close()
        }}
      />, popup.getContentElement())
    }

    const dispatch = (type, params) => {
      switch(type) {
        case "TOGGLE_TOOL":
          this.setState({
            pianoRollMouseMode: this.state.pianoRollMouseMode === 0 ? 1 : 0
          })
          break
        default:
          return this.props.dispatch(type, params)
      }
    }

    const toolbar = <Toolbar
      player={player}
      measureList={song.measureList}
      quantize={state.quantize}
      mouseMode={state.pianoRollMouseMode}
      autoScroll={state.pianoRollAutoScroll}
      onClickPlay={() => dispatch("PLAY")}
      onClickStop={() => dispatch("STOP")}
      onClickBackward={() => dispatch("MOVE_PLAYER_POSITION", { tick: -Config.TIME_BASE * 4 })}
      onClickForward={() => dispatch("MOVE_PLAYER_POSITION", { tick: Config.TIME_BASE * 4 })}
      onClickPencil={onClickPencil}
      onClickSelection={onClickSelection}
      onClickScaleUp={onClickScaleUp}
      onClickScaleDown={onClickScaleDown}
      onSelectQuantize={onSelectQuantize}
      onClickAutoScroll={onClickAutoScroll}
    />

    const pianoRoll = <PianoRoll
      track={selectedTrack}
      quantizer={quantizer}
      player={player}
      endTick={song.endOfSong}
      scaleX={state.pianoRollScaleX}
      scaleY={state.pianoRollScaleY}
      autoScroll={state.pianoRollAutoScroll}
      onChangeTool={onChangeTool}
      onClickKey={onClickKey}
      mouseMode={state.pianoRollMouseMode}
      dispatch={dispatch}
    />

    const menu = Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "New",
            click: () => {
              app.song = Song.emptySong()
            }
          },
          {
            label: "Open",
            click: () => {
              dialog.showOpenDialog({filters: [{
                name: "Standard MIDI File",
                extensions: ["mid", "midi"]
              }]}, files => {
                if (files) {
                  app.open(files[0])
                }
              })
            }
          },
          {
            label: "Save",
            click: () => {
              app.saveSong(song.filepath)
            }
          },
          {
            label: "Save As",
            click: () => {
              dialog.showSaveDialog({filters: [{
                name: "Standard MIDI File",
                extensions: ["mid", "midi"]
              }]}, filepath => {
                app.saveSong(filepath)
              })
            }
          }
        ]
      },
      {
        label: "Edit",
        submenu: [
          {
            label: "Undo"
          },
          {
            label: "Redo"
          }
        ]
      }
    ])

    Menu.setApplicationMenu(menu)

    const trackList =
      <TrackList
        player={player}
        tracks={(song && song.tracks) || []}
        tempo={song.getTrack(0).tempo}
        selectedTrackId={selectedTrackId}
        trackMute={trackMute}
        onClickMute={trackId => dispatch("TOGGLE_MUTE_TRACK", { trackId })}
        onClickSolo={trackId => dispatch("TOGGLE_SOLO_TRACK", { trackId })}
        onSelectTrack={trackId => dispatch("SELECT_TRACK", { trackId })}
        onClickDelete={trackId => dispatch("REMOVE_TRACK", { trackId })}
        onClickAddTrack={() => dispatch("ADD_TRACK")}
        onChangeName={e => dispatch("SET_TRACK_NAME", { name: e.target.value })}
        onChangeTempo={e => dispatch("SET_TEMPO", { tempo: parseFloat(e.target.value) })}
        onChangeVolume={(trackId, value) => dispatch("SET_TRACK_VOLUME", { trackId, volume: value })}
        onChangePan={(trackId, value) => dispatch("SET_TRACK_PAN", { trackId, pan: value })}
        onClickInstrument={onClickTrackInstrument}
      />

    const tempoGraph = <TempoGraph
      track={selectedTrack}
      player={player}
      endTick={song.endOfSong} />

    return <div className="RootView">
      <Helmet><title>{song.name} ― signal</title></Helmet>
      {toolbar}
      <Pane split="vertical" minSize={200} defaultSize={265} maxSize={400}>
        {trackList}
        {selectedTrack.isConductorTrack ? tempoGraph : pianoRoll}
      </Pane>
    </div>
  }
}
