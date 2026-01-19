import type { BoardSize } from "../config.js";

export type DropDict = Record<string, number>;

export type CompleteMode = "AND" | "OR";

export interface TileConfig {
  boss: string;
  drops: DropDict;
  mode: CompleteMode;
}



export interface TeamProgress { [tile: number]: Record<string, number>; }

export type PendingKind = "drop" | "chest";

export interface PendingBase {
  kind: PendingKind;
  guildId: string;
  team: string;
  submitChannelId: string;
  teamMessageId?: string;
  outputMessageId?: string;
  imageUrl?: string;
  createdBy: string;
}

export interface PendingDrop extends PendingBase {
  kind: "drop";
  tile: number;
  boss: string;
  drop: string;
  target: number;
  delta: number;
  snapshot: number;
}

export interface PendingChest extends PendingBase {
  kind: "chest";
  boss: string;
  userId: string;
}

export type Pending = PendingDrop | PendingChest;

export interface BingoOptions {
  boardSize: BoardSize;
  dailyUpdates: boolean;
  chestVerify: boolean;
  allowPlayersCheckTeams: boolean;
  trackFirstLine: boolean;
  trackPlayerStats: boolean;
}

export interface StatsEntry {
  userId: string;
  team: string;
  tile: number;
  boss: string;
  drop: string;
  amount: number;
  ts: number;
}

export interface EventState {
  channels: any;
  active: boolean;
  started: boolean;
  verificationOpen?: boolean;
  options: BingoOptions;
  outputChannelId?: string;
  announcementsChannelId?: string;
  teamToChannel: Record<string, string>;
  channelToTeam: Record<string, string>;
  tiles: Record<number, TileConfig>;
  progress: Record<string, TeamProgress>;
  pending: Record<string, Pending>;
  chestVerifiedUsers: Record<string, string[]>;
  firstLineAwardedTo?: string;
  placements: string[];
  stats: StatsEntry[];
}
