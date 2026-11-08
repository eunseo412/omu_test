// 아이템 상세 + 대여 신청 (기간 선택 → request_rental RPC)
export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="p-4">아이템 {id}</main>;
}
