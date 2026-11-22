import type { ProofShot, RentalStatus } from "@omu/core";

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
  kind: "status" | "receipt"; // receipt = 빌린 사람의 받은 상태 확인
  photos: { url: string; shot: ProofShot }[]; // 서명된 URL + 어떤 컷인지
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
  receivedAt: string | null; // 빌린 사람이 받은 상태를 확인한 시각
  proofsPurged: boolean; // 보관 기간(30일)이 지나 상태 사진이 삭제됨
};
