export const enum Status {
  Unknown,
  Active,
  Suspended,
  Banned,
}

export const enum Configuration {
  DeleteRate,
  PlatformTakeRate,
  DividendThreshold,
  MaxLevel,
  ViralityBonus,
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
