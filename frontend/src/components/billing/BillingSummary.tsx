interface BillingLineItem {
  description: string;
  category: string;
  unitPrice: number;
  discountPct: number;
  finalPrice: number;
}

interface BillingSummaryProps {
  items: BillingLineItem[];
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function BillingSummary({ items, grossAmount, discountAmount, netAmount }: BillingSummaryProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Bill Summary</h2>

      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center justify-between text-sm">
            <div>
              <p className="text-foreground">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {item.category}
                {item.discountPct > 0 && ` — ${item.discountPct}% off`}
              </p>
            </div>
            <div className="text-right">
              {item.discountPct > 0 && (
                <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.unitPrice)}</p>
              )}
              <p className="font-semibold text-foreground">{formatCurrency(item.finalPrice)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Gross Amount</span>
          <span>{formatCurrency(grossAmount)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between font-semibold text-success">
            <span>You saved</span>
            <span>{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-foreground">
          <span>Net Payable</span>
          <span>{formatCurrency(netAmount)}</span>
        </div>
      </div>
    </div>
  );
}
