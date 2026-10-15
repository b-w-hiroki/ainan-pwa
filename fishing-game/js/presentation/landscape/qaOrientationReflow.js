import { isNativeLandscapeQaResize } from './nativeLandscapeQaFlags.js'

// Scene-local QA orientation restart hook. The six preview UIs calculate their
// geometry only in create(). On a live mobile orientation change, rebuild the
// active scene instead of leaving old hit areas under a resized canvas.
//
// This never installs on a normal production page; native-wide all-scenes
// remains an explicit QA-only feature until world/art/device approval.
export function installQaOrientationReflow(SceneClass, qaLayoutProperty) {
  if(SceneClass.prototype.__ainanQaOrientationReflowInstalled)return
  SceneClass.prototype.__ainanQaOrientationReflowInstalled=true
  const previous=SceneClass.prototype.create
  SceneClass.prototype.create=function(...args) {
    const search=typeof window==='undefined'?'':window.location.search
    if(!isNativeLandscapeQaResize(search)) return previous.apply(this,args)
    if(Object.hasOwn(this,qaLayoutProperty))delete this[qaLayoutProperty]
    const result=previous.apply(this,args)
    let lastWidth=this.scale.width,lastHeight=this.scale.height
    let pending=false
    const onResize=(size)=>{
      const width=size?.width??this.scale.width
      const height=size?.height??this.scale.height
      if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return
      if(width===lastWidth&&height===lastHeight)return
      lastWidth=width
      lastHeight=height
      if(!this.sys.isActive()||pending)return
      pending=true
      this.time.delayedCall(0,()=>{
        pending=false
        if(this.sys.isActive())this.scene.restart(args[0]??{})
      })
    }
    this.scale.on('resize',onResize)
    // A scene restart emits SHUTDOWN; remove the old callback before any
    // subsequent create() so taps/timers are never multiplied on rotation.
    this.events.once('shutdown',()=>this.scale.off('resize',onResize))
    return result
  }
}
