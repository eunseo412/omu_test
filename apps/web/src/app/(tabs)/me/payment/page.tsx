import { AppHeader } from "@/components/layout/app-header";
import { PaymentMethodsView } from "@/features/payments/components/payment-methods-view";
import { getMyPaymentMethods } from "@/features/payments/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "결제수단" };

export default async function PaymentPage() {
  const methods = await getMyPaymentMethods();
  return (
    <>
      <AppHeader title="결제수단" back="/me" right={null} />
      <PaymentMethodsView methods={methods} />
    </>
  );
}
