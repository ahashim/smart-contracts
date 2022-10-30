export const enum Status {
  Unknown,
  Active,
  Suspended,
  Banned,
}

export const enum Configuration {
  DeleteRate,
  PlatformTakeRate,
  PoolPayoutThreshold,
  MaxLevel,
  ScoutViralityBonus,
  ViralityThreshold,
}

export const enum Interaction {
  Dislike,
  Like,
  Resqueak,
  UndoDislike,
  UndoLike,
  UndoResqueak,
}

export const enum Relation {
  Block,
  Follow,
  Unblock,
  Unfollow,
}
