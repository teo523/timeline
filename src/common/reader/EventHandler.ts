export default class EventHandler {
  // 先読み時間 (ms)
  // Leading time (MS)
  lookAheadTime = 50

  // 1/4 拍子ごとの tick 数
  // 1/4 TICK number for each beat
  timebase = 480

  private _currentTick = 0
  private _scheduledTick = 0
  private _prevTime: number | undefined = undefined

  constructor(tick = 0, timebase = 480, lookAheadTime = 50) {
    this._currentTick = tick
    this._scheduledTick = tick
    this.timebase = timebase
    this.lookAheadTime = lookAheadTime
  }

  get scheduledTick() {
    return this._scheduledTick
  }

  millisecToTick(ms: number, bpm: number) {
    return (((ms / 1000) * bpm) / 60) * this.timebase
  }

  tickToMillisec(tick: number, bpm: number) {
    return (tick / (this.timebase / 60) / bpm) * 1000
  }

  seek(tick: number) {
    this._currentTick = this._scheduledTick = Math.max(0, tick)
  }
}
