// Shared vocabulary for the whole app. Every module imports names from here so that
// content, 3D sets, characters, cutscenes and UI all agree. Do not rename members;
// adding members is fine if you also handle them where a switch over the union exists.

export type Vec3 = [number, number, number];

export type Gender = 'boy' | 'girl';

export type ModeId = 'outside' | 'inside' | 'short' | 'creative' | 'exam';

export type Weather = 'sunny' | 'rain' | 'wet' | 'dust';
export type TimeOfDay = 'morning' | 'afternoon';

export type InsideLocationId =
  | 'classroom'
  | 'lobby'
  | 'corridor_ground'
  | 'stairs'
  | 'clinic'
  | 'canteen'
  | 'prayer_room'
  | 'sports_hall'
  | 'principal'
  | 'computer_lab'
  | 'biology_lab'
  | 'art_room'
  | 'library'
  | 'corridor_first';

export type GroundsLocationId = 'yard' | 'football_field' | 'gate';

export type OutsideLocationId =
  | 'street_front'
  | 'crosswalk_main'
  | 'signal_crossing'
  | 'bus_stop'
  | 'pickup_lane'
  | 'parking'
  | 'sidewalk_far'
  | 'houses'
  | 'roadworks'
  | 'park'
  | 'flood_dip'
  | 'mosque';

export type LocationId = InsideLocationId | GroundsLocationId | OutsideLocationId;

/** Alrashed's face screen. See docs/plan/Screens_and_UI.md "Alrashed's face expressions". */
export type Expression =
  | 'idle' // idle blink
  | 'smile'
  | 'happy' // big smile (also used for "Big smile and wave")
  | 'listening'
  | 'thinking'
  | 'talking'
  | 'explaining'
  | 'warning'
  | 'surprised'
  | 'worried'
  | 'proud' // star eyes
  | 'gentle'
  | 'hearts'
  | 'laughing'
  | 'confused'
  | 'lookLRL' // eyes slide left, right, left
  | 'lightbulb'
  | 'timer'
  | 'counting'
  | 'sunDrop'
  | 'celebration'
  | 'sleepy'
  | 'glow'
  | 'relieved'
  | 'focused';

/** The status pill (top left). */
export type Status = 'ready' | 'listening' | 'thinking' | 'speaking' | 'explaining' | 'waving' | 'walking';

/** Parts of a 4-part scenario text; each part sets the face while it is spoken. */
export type SpeechPart = 'opening' | 'must' | 'avoid' | 'slogan' | 'body';

export const PART_EXPRESSION: Record<SpeechPart, Expression> = {
  opening: 'happy',
  must: 'explaining',
  avoid: 'warning',
  slogan: 'proud',
  body: 'talking',
};

/** Alrashed's animation clips (procedural). */
export type RobotClip =
  | 'idle'
  | 'wave'
  | 'walk'
  | 'jog'
  | 'lookLeft'
  | 'lookRight'
  | 'lookLRL'
  | 'point'
  | 'stopHand'
  | 'warnRaise'
  | 'explain1'
  | 'explain2'
  | 'explain3'
  | 'thumbsUp'
  | 'nod'
  | 'headShake'
  | 'clap'
  | 'celebrate'
  | 'bow'
  | 'sitDrive'
  | 'holdHandWalk'
  | 'closeUmbrella'
  | 'crouch'
  | 'catch'
  | 'extinguisher'
  | 'washHands'
  | 'bandage'
  | 'gloves'
  | 'coverFace'
  | 'countFingers'
  | 'kneel'
  | 'talk';

/** Clips every human character (boys and adults) supports. */
export type HumanClip =
  | 'idle'
  | 'walk'
  | 'run'
  | 'walkDistracted'
  | 'stopStepBack'
  | 'lookUpSurprised'
  | 'lookLRL'
  | 'climbSteps'
  | 'sit'
  | 'sitDesk'
  | 'leanOut'
  | 'buckle'
  | 'holdHands'
  | 'chaseBall'
  | 'kick'
  | 'hangGoal'
  | 'slideRail'
  | 'slip'
  | 'trip'
  | 'noseTiltBack'
  | 'noseLeanForward'
  | 'cough'
  | 'laugh'
  | 'coverNose'
  | 'faint'
  | 'lieDown'
  | 'drink'
  | 'stretch'
  | 'forwardRoll'
  | 'raiseHand'
  | 'cheer'
  | 'clap'
  | 'wave'
  | 'point'
  | 'talk'
  | 'crouch'
  | 'jump'
  | 'wipeForehead'
  | 'holdHead'
  | 'washHands'
  | 'eat'
  | 'cut'
  | 'pushButton'
  | 'mop'
  | 'drive'
  | 'thumbsUp'
  | 'nod'
  | 'headShake'
  | 'swing'
  | 'slide'
  | 'carry';

export type CharacterKind =
  | 'boy'
  | 'teacher' // white thobe and ghutra
  | 'counselor' // thobe + light-blue medical vest
  | 'guard' // dark uniform and cap
  | 'organizer' // thobe + yellow reflective vest
  | 'cleaner' // blue coverall, mop
  | 'stranger' // casual clothes, cap, sunglasses; calm, never scary
  | 'parent'; // thobe, seen in cars

export interface BoySpec {
  /** CSS color of the shirt. Random from SHIRT_COLORS when omitted. */
  shirt: string;
  striped: boolean;
  pants: 'blue' | 'black';
  /** 0 (light) .. 4 (dark) across the Saudi range. */
  skin: number;
  height: 'small' | 'medium' | 'tall';
  hair: 'black' | 'brown';
  /** Backpack color or null for none. */
  backpack: string | null;
}

export const SHIRT_COLORS = ['#E5484D', '#F5C518', '#FF8A3D', '#7CC4FA', '#3DBE6E', '#9B6BF2', '#FFFFFF', '#FF6FA8'] as const;

/** Things Alrashed or a person can hold in a hand. */
export type HoldItem =
  | 'umbrella'
  | 'umbrellaClosed'
  | 'extinguisher'
  | 'bandage'
  | 'gauze'
  | 'ball'
  | 'scissors'
  | 'waterBottle'
  | 'sodaCan'
  | 'clipboard'
  | 'mask'
  | 'backpack'
  | 'pencil'
  | 'brush' // paint brush (art room)
  | 'sandwich'
  | 'mop'
  | 'phoneless'; // placeholder, never rendered (phones are never shown)

/** Props placed by cutscenes. Static set dressing lives in the location sets, not here. */
export type PropKind =
  | 'car' // params: { color?: string; lights?: 'off'|'head'|'reverse'|'brake'; wipers?: boolean; driver?: boolean }
  | 'bus' // the yellow school bus. params: { door?: 'open'|'closed'; stopArm?: boolean }
  | 'ball' // params: { color?: string; kind?: 'football'|'basketball'|'dodge' }
  | 'cone'
  | 'barrierTape' // params: { length?: number }
  | 'manhole' // open manhole + cover beside it
  | 'puddle' // params: { radius?: number; splash?: boolean }
  | 'fire' // small contained flame (bin fire), params: { size?: number; out?: boolean }
  | 'smoke' // params: { density?: number }
  | 'extinguisherSpray'
  | 'extinguisher' // standing fire extinguisher (the hand-held model set down on the floor)
  | 'wetFloorSign'
  | 'umbrella' // open umbrella standing alone
  | 'waterBottle'
  | 'sodaCan'
  | 'scissors'
  | 'paperStar'
  | 'beaker' // params: { color?: string }
  | 'brokenGlass'
  | 'mat'
  | 'ballCart'
  | 'firstAidKit'
  | 'chair'
  | 'stool'
  | 'tray'
  | 'lunchbox'
  | 'trafficLight' // params: { state?: 'red'|'green'|'greenFlash' } (pedestrian light at signal_crossing is part of the set; use this for extra)
  | 'speechBubbleIcon' // floating pictogram above a head. params: { icon: 'check'|'cross'|'warning'|'question'|'heart'|'star' }
  | 'arrowMarker' // floating arrow on the ground. params: { color?: string }
  | 'confetti'
  | 'dustCloud'
  | 'rainbow'
  | 'boardImage' // smartboard content. params: { image: 'logo'|'flame'|'bulbOff'|'rain'|'extinguisher'|'firstAid'|'blank' }
  | 'sandwich'
  | 'peanutSnack'
  | 'cable'
  | 'powerStrip'
  | 'socketCover'
  | 'goggles'
  | 'gloves'
  | 'bucket'
  | 'leaf'
  | 'plasticBag'
  | 'pencil' // a loose yellow pencil, params: { color?: string }
  | 'stopSign'; // handheld stop sign of the traffic organizer

export type SfxName =
  | 'pop'
  | 'slide'
  | 'ring'
  | 'listenStart'
  | 'listenStop'
  | 'bell'
  | 'footsteps'
  | 'servo'
  | 'busEngine'
  | 'doorHiss'
  | 'carPass'
  | 'horn'
  | 'engineRoar'
  | 'screech'
  | 'rain'
  | 'thunder'
  | 'drips'
  | 'wind'
  | 'fireAlarm'
  | 'spray'
  | 'tap'
  | 'seatbelt'
  | 'whistle'
  | 'bounce'
  | 'cheer'
  | 'confetti'
  | 'chime'
  | 'whoosh'
  | 'thud'
  | 'heartbeat'
  | 'click'
  | 'ding'
  | 'cough'
  | 'snip'
  | 'splash'
  | 'beep'
  | 'drumroll'
  | 'birds'
  | 'murmur'
  | 'laugh'
  | 'clap'
  | 'powerDown'
  | 'powerUp'
  | 'menuMusic';

export type Ease = 'linear' | 'inOut' | 'in' | 'out';

export type Quality = 'low' | 'medium' | 'high';
