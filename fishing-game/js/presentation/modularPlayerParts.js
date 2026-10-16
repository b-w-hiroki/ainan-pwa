// AINAN W03.1 rig and acceptance contract for future independent alpha assets.
// Body A/B and clothing are REQUIRED source slots, not images that already exist.
// No legacy texture may be relabeled as a new independent body variant.
import { CHARACTER_MOTION_POSES } from './cast/CharacterMotionController.js'
import { ACCESSORY_VISUALS, ROD_VISUALS } from './equipmentVisuals.js'

const frame = Object.freeze({ width: 320, height: 420 })
const freezePoint = (x,y) => Object.freeze([x,y])
export const MODULAR_POSES = Object.freeze(Object.keys(CHARACTER_MOTION_POSES))
export const BODY_VARIANTS = Object.freeze(['body-a', 'body-b'])
export const PART_LAYERS = Object.freeze([
  Object.freeze({ id:'companion', depth:38, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'body', depth:41, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'lower', depth:41.12, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'shoes', depth:41.17, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'upper', depth:41.25, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'hair', depth:41.3, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'bag', depth:41.4, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'hat', depth:41.7, alpha:true, workUnit:'W03' }),
  Object.freeze({ id:'rod', depth:42, alpha:true, owner:'existing-native-rod' }),
  Object.freeze({ id:'line', depth:43, alpha:true, owner:'existing-native-line' }),
])

const isFinitePoint = value => Array.isArray(value) && value.length >= 2
  && value.slice(0,3).every(n => n == null || Number.isFinite(n))
const rotate = (x,y,angleDeg) => {
  const rad = angleDeg * Math.PI / 180
  return { x:x*Math.cos(rad)-y*Math.sin(rad),
    y:x*Math.sin(rad)+y*Math.cos(rad) }
}
export function resolveModularSocket(actor, anchor) {
  if (!actor || !isFinitePoint(anchor) || !Number.isFinite(anchor[0]) || !Number.isFinite(anchor[1])
    || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)
    || !Number.isFinite(actor.angle) || !Number.isFinite(actor.displayWidth)
    || !Number.isFinite(actor.displayHeight) || actor.displayWidth <= 0 || actor.displayHeight <= 0) {
    throw new TypeError('Finite actor transform and part socket required: values must be finite')
  }
  const local = rotate((anchor[0]-frame.width/2)*actor.displayWidth/frame.width,
    (anchor[1]-frame.height)*actor.displayHeight/frame.height,actor.angle)
  return Object.freeze({
    x:actor.x+local.x, y:actor.y+local.y,
    rotation:(actor.angle+(anchor[2]??0))*Math.PI/180,
    scale:actor.displayWidth/frame.width,
  })
}

export function poseRigSockets(poseName) {
  const p = CHARACTER_MOTION_POSES[poseName]
  if (!p) throw new RangeError('Unknown character pose: '+poseName)
  return Object.freeze({
    feet:freezePoint(frame.width/2,frame.height),
    hand:p.grip ? Object.freeze([...p.grip]) : null,
    rodTip:p.tip ? Object.freeze([...p.tip]) : null,
    hat:Object.freeze([...ACCESSORY_VISUALS.cap.anchors[poseName]]),
    bag:Object.freeze([...ACCESSORY_VISUALS.bag.anchors[poseName]]),
  })
}

export function prepareModularParts({
  bodyVariant='body-a',rodId='carbon',hatId=null,bagId=null,companionId=null,
  upperId=null,lowerId=null,shoesId=null,hairId=null,
}={}) {
  if (!BODY_VARIANTS.includes(bodyVariant)) throw new RangeError('Unknown body variant')
  if (!Object.hasOwn(ROD_VISUALS,rodId)) throw new RangeError('Unknown rod visual')
  const clothing = { hat:hatId,bag:bagId,upper:upperId,lower:lowerId,shoes:shoesId,hair:hairId }
  for(const value of Object.values(clothing)){
    if (value!==null && (typeof value!=='string' || !value.trim())) {
      throw new TypeError('Outfit IDs must be nonblank strings or null')
    }
  }
  if(companionId!==null && (typeof companionId!=='string'||!companionId.trim()))throw new TypeError('Invalid companion')
  const options = Object.freeze({
    bodyVariant,rodId,companionId,...clothing,
  })
  return Object.freeze({
    options,
    // Data contract, not an accepted runtime texture/saved equipment ID.
    availableNewSourceFiles:0,
    independentBodiesApproved:false,
    independentOutfitsApproved:false,
    companionApproved:false,
    nativeRodOwnerCount:1,
    sourceFiles: Object.freeze(BODY_VARIANTS.map(id=>Object.freeze({
      id,poseFilesRequired:Object.freeze([...MODULAR_POSES]),sourcePath:null,artApproval:false,
    }))),
    renderStack:Object.freeze(PART_LAYERS.map(layer=>Object.freeze({...layer}))),
  })
}
