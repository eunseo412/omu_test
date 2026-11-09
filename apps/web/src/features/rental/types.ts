import type { RentalStatus } from "@omu/core";

export type Party = { id: string; handle: string; displayName: string; avatarUrl: string | null; trustTemp: number };

export type RentalListItem = {
  id: string;
  status: RentalStatus;
  role: "owner" | "renter";
  startDate: string;
  endDate: string;
  feeTotal: number;
  itemTitle: string;
  itemImage: string | null;
  counterpart: Pick<Party, "handle" | "displayName">;
  myTurn: boolean;
  updatedAt: string;
};

export type RentalEvent = {
  id: number;
  actorId: string | null;
  from: RentalStatus | null;
  to: RentalStatus;
  note: string | null;
  photos: string[]; // 서명된 URL
  createdAt: string;
};

export type ChatMessage = { id: number; senderId: string; body: string; createdAt: string };

export type RentalDetail = {
  id: string;
  status: RentalStatus;
  role: "owner" | "renter";
  myId: string;
  startDate: string;
  endDate: string;
  handoffMethod: string;
  pricePerDay: number;
  feeTotal: number;
  deposit: number;
  item: { id: string; title: string; imageUrl: string | null };
  counterpart: Party;
  events: RentalEvent[];
  messages: ChatMessage[];
  myReviewDone: boolean;
};
