// 거래 상세: 상태 타임라인, 인도/반납 사진, 1:1 채팅, 반납 승인
export default async function RentalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="p-4">거래 {id}</main>;
}
