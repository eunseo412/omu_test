// 사람(옷장) 프로필: 추구미 태그, 체형, 신뢰도 온도, 옷장 그리드, 착장
export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <main className="p-4">@{handle}의 옷장</main>;
}
