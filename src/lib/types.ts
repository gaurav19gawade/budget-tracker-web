export type Member = {
  userId: string;
  email: string;
  displayName: string | null;
  joinedAt: string;
};

export type HouseholdInfo = {
  id: string;
  name: string;
  members: Member[];
};

export type Me = {
  userId: string;
  email: string;
  displayName: string | null;
  household: HouseholdInfo | null;
  canCreateHousehold: boolean;
};

export type InviteStatus = "ACTIVE" | "USED" | "REVOKED" | "EXPIRED";

export type Invite = {
  id: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  status: InviteStatus;
};

export type CreatedInvite = {
  id: string;
  token: string;
  expiresAt: string;
};

export type Account = {
  id: string;
  institution: string;
  name: string;
  type: string;
  subtype: string | null;
  lastFour: string | null;
  currency: string;
  balanceAvailable: number | null;
  balanceLedger: number | null;
  lastSyncedAt: string | null;
};

export type Transaction = {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string | null;
  payee: string | null;
  memo: string | null;
  postedDate: string | null;
  transactedAt: string | null;
  pending: boolean;
  isInternalTransfer: boolean;
  categoryId: string | null;
  categoryOverride: boolean;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isSystem: boolean;
  createdAt: string;
};

export type MatchField =
  | "PAYEE_CONTAINS"
  | "DESCRIPTION_CONTAINS"
  | "AMOUNT_GTE"
  | "AMOUNT_LTE"
  | "ACCOUNT_ID";

export type CategoryRule = {
  id: string;
  categoryId: string;
  priority: number;
  matchField: MatchField;
  matchValue: string;
  createdAt: string;
};

export type SyncResult = {
  newTransactions: number;
  updatedTransactions: number;
  syncedAt: string;
};
