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
