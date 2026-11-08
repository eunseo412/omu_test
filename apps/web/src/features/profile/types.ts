export type ClosetItem = {
  id: string;
  title: string;
  pricePerDay: number;
  imageUrl: string | null;
  tone: string;
  hidden: boolean;
};

export type ProfileData = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  styleTags: string[];
  heightCm: number | null;
  topSize: string | null;
  bottomSize: string | null;
  shoeSize: number | null;
  trustTemp: number;
  isVerifiedStudent: boolean;
  followerCount: number;
  followingCount: number;
  items: ClosetItem[];
  isMe: boolean;
  isFollowing: boolean;
  isLoggedIn: boolean;
  isSample: boolean;
};
