export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export function quatIdentity(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function quatNormalize(q: Quat): Quat {
  const m = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / m, y: q.y / m, z: q.z / m, w: q.w / m };
}

export function quatMul(a: Quat, b: Quat): Quat {
  // Hamilton product: a * b
  const x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  const y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  const z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  return { x, y, z, w };
}

export function quatFromAxisAngle(axis: Vec3, angleRad: number): Quat {
  const half = angleRad * 0.5;
  const s = Math.sin(half);
  const c = Math.cos(half);
  const m = Math.hypot(axis.x, axis.y, axis.z) || 1;
  return { x: (axis.x / m) * s, y: (axis.y / m) * s, z: (axis.z / m) * s, w: c };
}

export function quatFromEuler(pitchRad: number, yawRad: number, rollRad: number): Quat {
  // Intrinsic rotations Z(roll) * Y(yaw) * X(pitch)
  const qx = quatFromAxisAngle(vec3(1, 0, 0), pitchRad);
  const qy = quatFromAxisAngle(vec3(0, 1, 0), yawRad);
  const qz = quatFromAxisAngle(vec3(0, 0, 1), rollRad);
  return quatNormalize(quatMul(qz, quatMul(qy, qx)));
}

export function quatRotateVec3(q: Quat, v: Vec3): Vec3 {
  // v' = q * (v,0) * q_conj
  const x = v.x, y = v.y, z = v.z;
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  // v + qw * t + cross(q.xyz, t)
  return {
    x: x + qw * tx + (qy * tz - qz * ty),
    y: y + qw * ty + (qz * tx - qx * tz),
    z: z + qw * tz + (qx * ty - qy * tx),
  };
}
