export type EyeType = "open" | "blink" | "sleep" | "happy" | "alert" | "wide";
export type MouthType = "smile" | "open" | "tongue" | "closed" | "yawn" | "pant";
export type EmoteType = "hearts" | "sleepZ" | "sparkles" | "surprise" | "sweat" | "question";

export interface LegPose {
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  pawX: number;
  pawY: number;
  isPlanted: boolean;
}

export interface AnimationFrame {
  frameIndex: number;
  durationMs: number;
  
  // Body posture
  torso: {
    x: number;
    y: number;
    angleDeg: number;
    squashX: number;
    squashY: number;
  };
  
  // Head & Face
  head: {
    x: number;
    y: number;
    angleDeg: number;
  };
  ears: {
    leftAngle: number;
    rightAngle: number;
  };
  eyes: {
    type: EyeType;
  };
  mouth: {
    type: MouthType;
  };

  // Four limbs
  frontLeftLeg: LegPose;
  frontRightLeg: LegPose;
  backLeftLeg: LegPose;
  backRightLeg: LegPose;

  // Tail
  tail: {
    angleDeg: number;
    wagOffset: number;
  };

  // Grounding & Shadow
  groundContactY: number;
  shadow: {
    width: number;
    opacity: number;
    offsetX: number;
  };

  // Optional visual emote
  emote?: EmoteType;
}