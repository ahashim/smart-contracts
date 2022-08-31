export const enum AccountStatus {
  NonExistent,
  Active,
  Suspended,
  Banned,
}

export const enum Configuration {
  PlatformTakeRate,
  PoolPayoutThreshold,
  ScoutMaxLevel,
  ScoutViralityBonus,
  ViralityThreshold,
}

export const enum Interaction {
  Delete,
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
