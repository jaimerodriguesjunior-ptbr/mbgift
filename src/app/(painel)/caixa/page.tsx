"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Barcode, CreditCard, FileText, Minus, Plus, Receipt, Search, ShoppingCart, Trash2, TrendingDown, TrendingUp, User, Wallet } from "lucide-react";
import Link from "next/link";
import { GiftAlertModal, type GiftReservationCandidate } from "@/components/caixa/GiftAlertModal";
import { PaymentModal, type PaymentEntry, type PaymentMethod } from "@/components/caixa/PaymentModal";
import { type GiftListRecord } from "@/lib/gift-lists/types";
import { type TenantStoreIdentity } from "@/lib/tenants/types";
import { cancelSale, createSale, fetchClients, fetchConditionals, fetchCurrentTenantSettings, fetchGiftLists, fetchProducts, fetchSales } from "@/lib/painel-api";
import { getAvailableStock, readCheckoutDraft, writeCheckoutDraft } from "@/lib/operations";
import { type CheckoutDraft, type Client, type ConditionalRecord, type Product, type SaleItemOrigin, type SaleRecord } from "@/types";

// ──────────────── types ───────────────────────────────────────────────────
interface CartItem {
  product: Product;
  qty: number;
  isGift: boolean;
  sourceType: SaleItemOrigin;
  giftListName?: string;
  giftListItemId?: string;
  giftGuestName?: string;
  locked?: boolean;
  readOnly?: boolean;
}

interface Expense {
  id: string;
  label: string;
  amount: number;
}

// ──────────────── helpers ─────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const METHOD_LABEL: Record<PaymentMethod, string> = { credito: "CC", debito: "CD", pix: "PIX", dinheiro: "Din.", boleto: "Bol." };
const METHOD_COLOR: Record<PaymentMethod, string> = { credito: "text-purple-700", debito: "text-blue-700", pix: "text-green-700", dinheiro: "text-amber-700", boleto: "text-orange-700" };
const getCartItemKey = (item: CartItem) =>
  item.giftListItemId ? `${item.product.id}:gift:${item.giftListItemId}` : `${item.product.id}:${item.sourceType}`;

function formatStoreAddress(tenant: TenantStoreIdentity | null) {
  if (!tenant) {
    return "";
  }

  const line1 = [tenant.addressLine1, tenant.addressLine2].filter(Boolean).join(", ");
  const line2 = [tenant.addressDistrict, [tenant.addressCity, tenant.addressState].filter(Boolean).join(" - "), tenant.addressZipCode]
    .filter(Boolean)
    .join(" • ");

  return [line1, line2].filter(Boolean).join(" | ");
}

// ──────────────── main page ───────────────────────────────────────────────
export default function CaixaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [conditionals, setConditionals] = useState<ConditionalRecord[]>([]);
  const [giftLists, setGiftLists] = useState<GiftListRecord[]>([]);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [eanInput, setEanInput] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [cpf, setCpf] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [saleDone, setSaleDone] = useState(false);
  const [activeSale, setActiveSale] = useState<SaleRecord | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editExpenseLabel, setEditExpenseLabel] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");

  // Gift alert state
  const [giftAlert, setGiftAlert] = useState<{ productName: string; product: Product; matches: GiftReservationCandidate[] } | null>(null);
  const [saleOrigin, setSaleOrigin] = useState<{ type: "direct" | "conditional"; id?: string }>({ type: "direct" });
  const [storeLabel, setStoreLabel] = useState("MBGifts");
  const [tenantIdentity, setTenantIdentity] = useState<TenantStoreIdentity | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const checkoutDraftAppliedRef = useRef(false);

  useEffect(() => {
    setCheckoutDraft(readCheckoutDraft());
  }, []);

  async function refreshOperationalData() {
    const [productsPayload, salesPayload, conditionalsPayload, giftListsPayload] = await Promise.all([
      fetchProducts(),
      fetchSales(),
      fetchConditionals(),
      fetchGiftLists()
    ]);

    setProducts(productsPayload);
    setSales(salesPayload);
    setConditionals(conditionalsPayload);
    setGiftLists(giftListsPayload);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        const [productsPayload, clientsPayload, salesPayload, conditionalsPayload, giftListsPayload, tenant] = await Promise.all([
          fetchProducts(),
          fetchClients(),
          fetchSales(),
          fetchConditionals(),
          fetchGiftLists(),
          fetchCurrentTenantSettings().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setProducts(productsPayload);
        setClients(clientsPayload);
        setSales(salesPayload);
        setConditionals(conditionalsPayload);
        setGiftLists(giftListsPayload);
        setTenantIdentity(tenant);
        setStoreLabel(tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts");
      } catch (error) {
        if (isMounted) {
          window.alert(error instanceof Error ? error.message : "Falha ao carregar o caixa.");
        }
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  // F-key shortcut for CPF modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setShowCpfModal(true); }
      if (e.key === "F1") { e.preventDefault(); scanInputRef.current?.focus(); }
      if (e.key === "F10" && saleDone) { e.preventDefault(); handlePrint(); }
      if (e.key === "F12" && saleDone) { e.preventDefault(); handleNfcePrint(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saleDone]);

  useEffect(() => {
    if (!checkoutDraft || cart.length > 0 || saleDone || products.length === 0 || checkoutDraftAppliedRef.current) {
      return;
    }

    const draftItems = checkoutDraft.items
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return product
          ? {
              product,
              qty: item.qty,
              isGift: false,
              sourceType: "conditional",
              locked: true
            }
          : null;
      })
      .filter(Boolean) as CartItem[];

    if (draftItems.length === 0) {
      return;
    }

    checkoutDraftAppliedRef.current = true;
    setCart(draftItems);
    setSelectedClientId(checkoutDraft.clientId);
    setSaleOrigin({ type: "conditional", id: checkoutDraft.originId });
  }, [cart.length, checkoutDraft, products, saleDone]);

  // ──────────────── cart calculations ─────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discountAmt = subtotal * (discountPct / 100);
  const total = subtotal - discountAmt;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const isPaid = totalPaid >= total && total > 0;
  const isViewingClosedSale = saleDone && activeSale !== null;
  const normalizedClientNeedle = clientSearchTerm.trim().toLowerCase();
  const filteredClients = normalizedClientNeedle.length >= 2
    ? clients
      .filter((client) => {
        const normalizedPhone = client.phone.replace(/\D/g, "");
        const normalizedCpf = (client.cpf ?? "").replace(/\D/g, "");
        const digitsNeedle = clientSearchTerm.replace(/\D/g, "");

        return (
          client.name.toLowerCase().includes(normalizedClientNeedle) ||
          client.instagram.toLowerCase().includes(normalizedClientNeedle) ||
          (digitsNeedle.length > 0 && normalizedPhone.includes(digitsNeedle)) ||
          (digitsNeedle.length > 0 && normalizedCpf.includes(digitsNeedle))
        );
      })
      .slice(0, 8)
    : [];
  const selectedClient = selectedClientId
    ? clients.find((client) => client.id === selectedClientId) ?? null
    : null;
  const activeClient = activeSale?.clientName ? { name: activeSale.clientName } : selectedClient;
  const trimmedEanInput = eanInput.trim();
  const isCodeLikeInput = /^\d{8,14}$/.test(trimmedEanInput);
  const manualSearchResults = trimmedEanInput.length >= 2 && !isCodeLikeInput
    ? products
      .filter((product) => !product.isDeleted)
      .filter((product) => {
        const normalizedNeedle = trimmedEanInput.toLowerCase();
        return (
          product.name.toLowerCase().includes(normalizedNeedle) ||
          product.category.toLowerCase().includes(normalizedNeedle) ||
          product.ean.includes(trimmedEanInput)
        );
      })
      .slice(0, 6)
    : [];
  const showManualSearchResults = trimmedEanInput.length >= 2 && !isCodeLikeInput;

  function buildSaleNote(sourceType: SaleItemOrigin, originType: "direct" | "conditional") {
    if (sourceType === "conditional") {
      return "Retorno de condicional";
    }

    if (originType === "conditional") {
      return "Adicionado na visita";
    }

    return undefined;
  }

  function buildFallbackProduct(item: SaleRecord["items"][number]) {
    return {
      id: item.productId,
      name: "Produto da venda",
      price: item.unitPrice,
      stock: 0,
      images: ["/fundoinicial.jpg"],
      mainImageIndex: 0,
      category: "Venda",
      ean: "",
      isDeleted: false
    } satisfies Product;
  }

  function openExistingSale(sale: SaleRecord) {
    const nextCart: CartItem[] = sale.items.map((item) => {
      const product = products.find((entry) => entry.id === item.productId) ?? buildFallbackProduct(item);
      const giftList = item.giftListItemId
        ? giftLists.find((list) => list.items.some((giftItem) => giftItem.id === item.giftListItemId))
        : null;
      const giftItem = item.giftListItemId
        ? giftList?.items.find((entry) => entry.id === item.giftListItemId)
        : null;

      return {
        product,
        qty: item.qty,
        isGift: Boolean(item.giftListItemId),
        sourceType: item.sourceType,
        giftListItemId: item.giftListItemId,
        giftListName: giftList?.hostName ?? giftList?.brideName,
        giftGuestName: giftItem?.guestName,
        readOnly: true
      };
    });

    const subtotalValue = sale.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const inferredDiscountPct = subtotalValue > 0
      ? Math.max(0, Math.round(((subtotalValue - sale.total) / subtotalValue) * 100))
      : 0;

    setActiveSale(sale);
    setCart(nextCart);
    setPayments(sale.payments);
    setDiscountPct(inferredDiscountPct);
    setSelectedClientId(sale.clientId ?? "");
    setCpf(sale.cpf ?? "");
    setSaleOrigin({ type: sale.originType, id: sale.originId });
    setSaleDone(true);
    setShowPayment(false);
    setEanInput("");
    setClientSearchTerm("");
  }

  const openSaleReceiptPrint = (input: {
    clientName?: string;
    cpfValue?: string;
    items: Array<{ productId: string; qty: number; unitPrice: number; note?: string }>;
    payments: PaymentEntry[];
    subtotalValue: number;
    discountValue: number;
    totalValue: number;
  }) => {
    const storeAddress = formatStoreAddress(tenantIdentity);
    const storePhone = tenantIdentity?.contactPhone ?? "";

    const rows = input.items
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;">
              <div style="font-weight:700;color:#2a2421;">${product?.name ?? item.productId}</div>
              ${item.note ? `<div style="margin-top:4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8c6d45;">${item.note}</div>` : ""}
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.qty}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${fmt(item.unitPrice)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${fmt(item.unitPrice * item.qty)}</td>
          </tr>
        `;
      })
      .join("");

    const paymentsRows = input.payments
      .map((payment) => `
        <tr>
          <td style="padding:6px 0;color:#5c4a33;">${METHOD_LABEL[payment.method]}</td>
          <td style="padding:6px 0;text-align:right;color:#2a2421;font-weight:700;">${fmt(payment.amount)}</td>
        </tr>
      `)
      .join("");

    const popup = window.open("", "_blank", "width=820,height=760");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <body style="font-family:Georgia,serif;padding:32px;color:#2a2421;">
          <h1 style="margin:0;letter-spacing:0.08em;">${storeLabel}</h1>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center;margin-top:6px;font-family:Arial,sans-serif;font-size:12px;color:#5c4a33;">
            <div style="display:flex;align-items:center;min-height:38px;">
              <p style="letter-spacing:0.25em;text-transform:uppercase;color:#8c6d45;margin:0;">Recibo de venda</p>
            </div>
            <div style="text-align:right;">
              ${storePhone ? `<p style="margin:0 0 4px;">${storePhone}</p>` : ""}
              ${storeAddress ? `<p style="margin:0;">${storeAddress}</p>` : ""}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:18px;padding:10px 0;border-top:1px solid #eadfce;border-bottom:1px solid #eadfce;font-family:Arial,sans-serif;font-size:13px;color:#2a2421;">
            <p style="margin:0;"><strong>Cliente:</strong> ${input.clientName ?? "Consumidor final"}</p>
            <p style="margin:0;text-align:right;"><strong>CPF na nota:</strong> ${input.cpfValue || "Consumidor final"}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-family:Arial,sans-serif;font-size:13px;">
            <thead>
              <tr>
                <th style="text-align:left;padding-bottom:10px;border-bottom:1px solid #ddd;">Produto</th>
                <th style="text-align:center;padding-bottom:10px;border-bottom:1px solid #ddd;">Qtd.</th>
                <th style="text-align:right;padding-bottom:10px;border-bottom:1px solid #ddd;">Unitário</th>
                <th style="text-align:right;padding-bottom:10px;border-bottom:1px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div style="margin-top:28px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;">
            <div style="min-width:230px;border:1px solid #eadfce;border-radius:20px;padding:14px 16px;background:#fdfbf7;font-family:Arial,sans-serif;">
              <p style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#8c6d45;">Pagamentos</p>
              <table style="width:100%;margin-top:10px;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
                <tbody>${paymentsRows}</tbody>
              </table>
            </div>

            <div style="min-width:230px;border:1px solid #eadfce;border-radius:20px;padding:14px 16px;background:#fdfbf7;font-family:Arial,sans-serif;">
              <div style="display:flex;justify-content:space-between;gap:16px;padding:4px 0;border-bottom:1px solid #eadfce;font-size:12px;">
                <span style="color:#5c4a33;">Subtotal</span>
                <strong style="color:#2a2421;">${fmt(input.subtotalValue)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #eadfce;font-size:12px;">
                <span style="color:#5c4a33;">Desconto</span>
                <strong style="color:#2a2421;">${fmt(input.discountValue)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0 0;font-size:12px;">
                <span style="letter-spacing:0.18em;text-transform:uppercase;color:#8c6d45;">Valor final</span>
                <strong style="color:#2a2421;">${fmt(input.totalValue)}</strong>
              </div>
            </div>
          </div>

          <script>
            window.onafterprint = function () {
              window.close();
            };

            window.addEventListener("load", function () {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
  };

  // ──────────────── EAN / barcode scan ───────────────────────────────────
  const handleEanInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saleDone) return;

    const ean = eanInput.trim();
    if (!ean) return;
    const product = products.find(p => !p.isDeleted && (p.ean === ean || p.id === ean));
    if (product) {
      checkGiftAndAddToCart(product);
      setEanInput("");
      return;
    }

    if (!isCodeLikeInput && manualSearchResults.length === 1) {
      checkGiftAndAddToCart(manualSearchResults[0]);
      setEanInput("");
    }
  };

  const checkGiftAndAddToCart = (product: Product) => {
    if (saleDone) {
      return;
    }

    if (getAvailableStock(product.id, products, conditionals) <= 0) {
      window.alert("Este item está sem estoque disponível no momento.");
      return;
    }

    const reservedMatches = giftLists.flatMap((list) =>
      list.items
        .filter((item) => item.productId === product.id && item.status !== "comprado")
        .map((item) => ({
          giftListItemId: item.id,
          listName: list.brideName,
          guestName: item.guestName || list.hostName || list.brideName,
          status: item.status === "reservado" ? ("reservado" as const) : ("disponivel" as const)
        }))
    );

    if (reservedMatches.length > 0) {
      setGiftAlert({
        productName: product.name,
        product,
        matches: reservedMatches
      });
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: Product, options?: { giftMatch?: GiftReservationCandidate | null }) => {
    setCart(prev => {
      const giftMatch = options?.giftMatch ?? null;
      const isGift = Boolean(giftMatch);
      const sourceType: SaleItemOrigin = "direct";
      const existing = prev.find((item) => {
        if (giftMatch) {
          return item.giftListItemId === giftMatch.giftListItemId;
        }

        return item.product.id === product.id && !item.giftListItemId && item.sourceType === sourceType;
      });
      const maxAvailable = getAvailableStock(product.id, products, conditionals);
      const currentQty = existing?.qty ?? 0;
      const maxQty = giftMatch ? 1 : maxAvailable;

      if (currentQty >= maxQty) {
        window.alert("Quantidade indisponível para venda agora.");
        return prev;
      }

      if (existing) {
        return prev.map((item) => {
          if (giftMatch) {
            return item.giftListItemId === giftMatch.giftListItemId
              ? { ...item, qty: Math.min(maxQty, item.qty + 1) }
              : item;
          }

          return item.product.id === product.id && !item.giftListItemId && item.sourceType === sourceType
            ? { ...item, qty: Math.min(maxQty, item.qty + 1) }
            : item;
        });
      }

      return [
        ...prev,
        {
          product,
          qty: 1,
          isGift,
          sourceType,
          giftListName: giftMatch?.listName,
          giftListItemId: giftMatch?.giftListItemId,
          giftGuestName: giftMatch?.guestName
        }
      ];
    });
  };

  const removeFromCart = (itemKey: string) => setCart(prev => prev.filter(item => getCartItemKey(item) !== itemKey || item.locked || item.readOnly));

  const updateQty = (itemKey: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (getCartItemKey(i) !== itemKey || i.locked || i.readOnly || i.giftListItemId) {
        return i;
      }

      const maxAvailable = getAvailableStock(i.product.id, products, conditionals);
      const nextQty = Math.max(1, Math.min(maxAvailable, i.qty + delta));
      return { ...i, qty: nextQty };
    }).filter(i => i.qty > 0));
  };

  // ──────────────── payment flow ──────────────────────────────────────────
  const handleAddPayment = (entry: PaymentEntry) => {
    setPayments(prev => [...prev, entry]);
  };

  const handleFinalize = async () => {
    try {
      const sale = await createSale({
        total,
        payments,
        clientId: selectedClientId || undefined,
        cpf: cpf || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
          giftListItemId: item.giftListItemId,
          sourceType: item.sourceType
        })),
        originType: saleOrigin.type,
        originId: saleOrigin.id
      });

      if (saleOrigin.type === "conditional") {
        writeCheckoutDraft(null);
        setCheckoutDraft(null);
      }

      const nextSales = await fetchSales();
      const nextProducts = await fetchProducts();
      const nextConditionals = await fetchConditionals();
      const nextGiftLists = await fetchGiftLists();

      setSales(nextSales);
      setProducts(nextProducts);
      setConditionals(nextConditionals);
      setGiftLists(nextGiftLists);
      openExistingSale(sale);
      setShowPayment(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao registrar a venda.");
    }
  };

  const handlePrint = () => {
    const saleForPrint = activeSale;
    if (!saleDone || (!saleForPrint && cart.length === 0)) {
      return;
    }

    if (saleForPrint) {
      const subtotalValue = saleForPrint.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      const discountValue = Math.max(0, subtotalValue - saleForPrint.total);

      openSaleReceiptPrint({
        clientName: saleForPrint.clientName,
        cpfValue: saleForPrint.cpf,
        items: saleForPrint.items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          note: buildSaleNote(item.sourceType, saleForPrint.originType)
        })),
        payments: saleForPrint.payments,
        subtotalValue,
        discountValue,
        totalValue: saleForPrint.total
      });
      return;
    }

    openSaleReceiptPrint({
      clientName: activeClient?.name ?? undefined,
      cpfValue: cpf || undefined,
      items: cart.map((item) => ({
        productId: item.product.id,
        qty: item.qty,
        unitPrice: item.product.price,
        note: buildSaleNote(item.sourceType, saleOrigin.type)
      })),
      payments,
      subtotalValue: subtotal,
      discountValue: discountAmt,
      totalValue: total
    });
  };

  const handleReprintSale = (sale: SaleRecord) => {
    openExistingSale(sale);
  };

  const handleNfcePrint = () => {
    if (!saleDone) return;
    const saleForPrint = activeSale;
    window.alert(`[NFC-e SIMULADA]\nChave: ${Math.random().toString().slice(2, 18)}\nCliente: ${saleForPrint?.cpf || cpf || "Consumidor Final"}\nTotal: ${fmt(saleForPrint?.total ?? total)}`);
  };

  const handleCancelSale = async () => {
    if (!activeSale || activeSale.canceledAt) {
      return;
    }

    const confirmed = window.confirm("Deseja cancelar esta venda? O estoque sera recomposto e os vinculos de presente ou condicional serao restaurados.");
    if (!confirmed) {
      return;
    }

    try {
      const nextSales = await cancelSale(activeSale.id);
      const [nextProducts, nextConditionals, nextGiftLists] = await Promise.all([
        fetchProducts(),
        fetchConditionals(),
        fetchGiftLists()
      ]);

      setSales(nextSales);
      setProducts(nextProducts);
      setConditionals(nextConditionals);
      setGiftLists(nextGiftLists);

      const updatedSale = nextSales.find((entry) => entry.id === activeSale.id);
      if (updatedSale) {
        openExistingSale(updatedSale);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao cancelar a venda.");
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setDiscountPct(0);
    setPayments([]);
    setSaleDone(false);
    setActiveSale(null);
    setCpf("");
    setSelectedClientId("");
    setClientSearchTerm("");
    setEanInput("");
    setShowPayment(false);
    if (saleOrigin.type === "conditional" && !activeSale) {
      writeCheckoutDraft(null);
      setCheckoutDraft(null);
    }
    setSaleOrigin({ type: "direct" });
    checkoutDraftAppliedRef.current = false;
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const handleAddExpense = () => {
    const amt = parseFloat(expenseAmount);
    if (!expenseLabel || isNaN(amt) || amt <= 0) return;
    setExpenses(prev => [...prev, { id: `exp-${Date.now()}`, label: expenseLabel, amount: amt }]);
    setExpenseLabel("");
    setExpenseAmount("");
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditExpenseLabel(expense.label);
    setEditExpenseAmount(expense.amount.toString());
  };

  const handleSaveEditExpense = () => {
    if (!editingExpense) return;
    const amt = parseFloat(editExpenseAmount);
    if (!editExpenseLabel || isNaN(amt) || amt <= 0) return;
    setExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...e, label: editExpenseLabel, amount: amt } : e));
    setEditingExpense(null);
  };

  const handleDeleteExpense = () => {
    if (!editingExpense) return;
    setExpenses(prev => prev.filter(e => e.id !== editingExpense.id));
    setEditingExpense(null);
  };

  // ──────────────── daily summary calculations ───────────────────────────
  const activeSales = sales.filter((sale) => !sale.canceledAt);
  const allPayments = activeSales.flatMap(s => s.payments);
  const dayPix = allPayments.filter(p => p.method === "pix").reduce((s, p) => s + p.amount, 0);
  const dayCc = allPayments.filter(p => p.method === "credito").reduce((s, p) => s + p.amount, 0);
  const dayCd = allPayments.filter(p => p.method === "debito").reduce((s, p) => s + p.amount, 0);
  const dayDin = allPayments.filter(p => p.method === "dinheiro").reduce((s, p) => s + p.amount, 0);
  const dayBol = allPayments.filter(p => p.method === "boleto").reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const cashBalance = dayDin - totalExpenses;

  // Product quick-add (click from list)
  const handleProductClick = (product: Product) => {
    if (saleDone) {
      return;
    }

    checkGiftAndAddToCart(product);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header ── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/15 bg-white/65 backdrop-blur-md px-6 z-30 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-[#2a2421] hover:text-[#8c6d45] transition-all group">
          <div className="rounded-full bg-[#b08d57]/10 p-2 group-hover:bg-[#b08d57]/20 transition-all border border-[#b08d57]/15">
            <ArrowLeft className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Voltar</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="h-8 w-[2px] bg-[#b08d57]/20" />
          <h1 className="font-serif text-2xl text-[#2a2421] tracking-[0.2em] uppercase">{storeLabel}</h1>
          <div className="h-8 w-[2px] bg-[#b08d57]/20" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#8c6d45] font-extrabold">Caixa do Dia</p>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <span className="text-[#2a2421]/60">F1 FOCO • F2 CLIENTE • F10 RECIBO {saleDone && "• F12 NFC-E"}</span>
        </div>
      </header>

      {/* ── Main 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Product catalog quick-add ── */}
        <aside className="hidden xl:flex w-64 flex-shrink-0 flex-col border-r-2 border-[#b08d57]/10 bg-[#faf8f5]/55 backdrop-blur-md overflow-hidden">
          <div className="px-4 py-4 border-b border-[#b08d57]/10">
            <p className="text-sm font-black uppercase tracking-widest text-[#5c4a33]">Produtos</p>
            <p className="text-[10px] font-bold text-[#5c4a33]/60 mt-0.5">Clique para adicionar ao carrinho</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {products.filter((product) => !product.isDeleted).map(p => (
              <button key={p.id} onClick={() => handleProductClick(p)} className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-[#b08d57]/10 bg-white transition-all text-left group shadow-sm hover:border-[#b08d57]/30 hover:bg-[#fdfbf7]">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[#f7f2ed]">
                  <img src={p.images[p.mainImageIndex]} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#2a2421] truncate leading-tight">{p.name}</p>
                  <p className="text-[10px] font-black text-[#8c6d45]">{fmt(p.price)}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#a69b8f]">
                    Disp. {getAvailableStock(p.id, products, conditionals)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── CENTER: Cart / Current sale ── */}
        <main className="relative flex-1 flex flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(247,240,232,0.28),rgba(247,240,232,0.38)_45%,rgba(247,240,232,0.46))]" />

          {/* ── Scan bar & Total Display (NEW: Moved Total to TOP) ── */}
          <div className="relative z-10 px-8 py-6 border-b-2 border-[#b08d57]/15 bg-white/75 backdrop-blur-lg flex gap-8 items-start flex-shrink-0">
            <div className="relative flex-1">
              <form onSubmit={handleEanInput} className={`flex items-center gap-4 rounded-[2rem] border-2 px-6 py-3.5 shadow-sm transition-all ${saleDone ? "border-[#b08d57]/10 bg-[#f7f2ed]/80 opacity-70" : "border-[#b08d57]/15 bg-[#fdfbf7]/72 focus-within:border-[#8c6d45]/40"}`}>
                <div className="flex items-center gap-2 text-[#b08d57]">
                  <Barcode className="h-6 w-6" />
                  <Search className="h-5 w-5 opacity-70" />
                </div>
              <input
                ref={scanInputRef}
                type="text"
                placeholder="Código de barras / EAN — pressione F1 para focar"
                value={eanInput}
                onChange={e => setEanInput(e.target.value)}
                autoFocus
                disabled={saleDone}
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-black placeholder-[#c9bfb5] text-[#2a2421]"
              />
              <button
                type="submit"
                disabled={saleDone}
                className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md ${saleDone ? "bg-[#d8cec1] text-white cursor-not-allowed shadow-none" : "bg-[#8c6d45] text-white hover:bg-[#725a38] shadow-[#8c6d45]/20"}`}
              >
                Bipar
              </button>
              </form>

              {showManualSearchResults ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-[1.75rem] border border-[#b08d57]/20 bg-[#fffdfb] shadow-[0_24px_60px_rgba(92,74,51,0.18)]">
                  {manualSearchResults.length > 0 ? (
                    <div className="p-2">
                      {manualSearchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            checkGiftAndAddToCart(product);
                            setEanInput("");
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-[#f7f2ed]"
                        >
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-[#f7f2ed]">
                            <img src={product.images[product.mainImageIndex]} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#2a2421]">{product.name}</p>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-[#5c4a33]">{fmt(product.price)}</p>
                            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-[#a69b8f]">
                              Disp. {getAvailableStock(product.id, products, conditionals)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6d45]">Nenhum produto encontrado</p>
                      <p className="mt-1 text-sm text-[#a69b8f]">Continue digitando ou tente pelo EAN.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Prominent Total Display at the Top */}
            <div className="flex flex-col items-end min-w-[220px] pr-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8c6d45] mb-1">Total da Venda</span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-4xl text-[#5c4a33] font-bold leading-none">{fmt(total)}</span>
              </div>
              {activeSale?.canceledAt ? (
                <span className="mt-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-red-600">
                  Venda cancelada
                </span>
              ) : null}
            </div>

            {saleDone ? (
              <button onClick={handleNewSale} className="px-6 py-3 rounded-2xl bg-green-600 text-white text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20">
                Nova Venda
              </button>
            ) : null}
          </div>

          {/* Cart items */}
          <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                <ShoppingCart className="h-16 w-16 text-[#b08d57] mb-3" strokeWidth={1} />
                <p className="text-sm font-medium uppercase tracking-widest text-[#5c4a33]">Aguardando itens</p>
                <p className="text-xs text-[#a69b8f] mt-1">Bipe um produto ou selecione ao lado</p>
              </div>
            )}
            {cart.map((item) => {
              const itemSubtotal = item.product.price * item.qty;
              const itemDiscount = itemSubtotal * (discountPct / 100);
              const itemFinal = itemSubtotal - itemDiscount;
              return (
                <div key={getCartItemKey(item)} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${item.isGift ? "border-amber-200 bg-amber-50/70" : "border-[#b08d57]/20 bg-white shadow-md"}`}>
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[#f7f2ed]">
                    <img src={item.product.images[item.product.mainImageIndex]} alt={item.product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-base text-[#2a2421] truncate">{item.product.name}</span>
                      {item.isGift && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">Presente</span>}
                      {item.locked && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#f7f2ed] text-[#8c6d45] border border-[#b08d57]/20 flex-shrink-0">Condicional</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#a69b8f] font-medium">{fmt(item.product.price)} × {item.qty}</span>
                      {discountPct > 0 && <span className="text-[10px] font-bold text-red-600">-{discountPct}%</span>}
                    </div>
                    {item.locked ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d45]">
                        Retorno de condicional - finalize apenas o pagamento
                      </p>
                    ) : saleOrigin.type === "conditional" ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d45]">
                        Produto adicionado na visita
                      </p>
                    ) : null}
                    {item.isGift && item.giftListName ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                        {item.giftListName}{item.giftGuestName ? ` - ${item.giftGuestName}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(getCartItemKey(item), -1)}
                      disabled={item.locked || item.readOnly || Boolean(item.giftListItemId)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${item.locked || item.readOnly || item.giftListItemId ? "bg-[#f3ece5] text-[#c9bfb5] cursor-not-allowed" : "bg-[#f7f2ed] text-[#8c6d45] hover:bg-[#b08d57]/15"}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-black text-[#2a2421]">{item.qty}</span>
                    <button
                      onClick={() => updateQty(getCartItemKey(item), 1)}
                      disabled={item.locked || item.readOnly || Boolean(item.giftListItemId)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${item.locked || item.readOnly || item.giftListItemId ? "bg-[#f3ece5] text-[#c9bfb5] cursor-not-allowed" : "bg-[#8c6d45] text-white hover:bg-[#725a38]"}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right w-24 flex-shrink-0">
                    <p className="font-black text-base text-[#2a2421]">{fmt(itemFinal)}</p>
                    {discountPct > 0 && <p className="text-[10px] text-[#a69b8f] line-through">{fmt(itemSubtotal)}</p>}
                  </div>
                  <button
                    onClick={() => removeFromCart(getCartItemKey(item))}
                    disabled={item.locked || item.readOnly}
                    className={`p-1.5 rounded-lg transition-all ${item.locked || item.readOnly ? "text-[#d7cec4] cursor-not-allowed" : "text-[#a69b8f] hover:bg-red-50 hover:text-red-500"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Totals & actions */}
          <div className="relative z-10 border-t-2 border-[#b08d57]/12 bg-[#f8f2eb]/80 backdrop-blur-md px-6 py-4">
            {/* Payments done */}
            {payments.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                {payments.map((p, i) => (
                  <span key={i} className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                    p.method === "pix" ? "bg-green-50 text-green-700 border-green-200" :
                    p.method === "credito" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    p.method === "debito" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    p.method === "dinheiro" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-orange-50 text-orange-700 border-orange-200"
                  }`}>
                    {METHOD_LABEL[p.method]} {fmt(p.amount)}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end justify-between gap-6">
              {/* Left: discount */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#5c4a33] mb-1 leading-none">Desconto</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={discountPct}
                      onChange={e => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-14 rounded-lg border border-[#b08d57]/20 bg-[#fdfbf7] px-2 py-1 text-sm font-black text-[#2a2421] text-center focus:outline-none focus:border-[#8c6d45]"
                      min={0} max={100} step={1}
                      disabled={saleDone}
                    />
                    <span className="text-sm font-black text-[#2a2421]">%</span>
                    {discountPct > 0 && <span className="text-xs font-bold text-red-600">- {fmt(discountAmt)}</span>}
                  </div>
                </div>
              </div>

              {/* Middle: totals (Simplified as Total is now at the Top) */}
              <div className="flex items-baseline gap-6 border-l border-[#b08d57]/10 pl-6 ml-auto">
                {discountPct > 0 && (
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#5c4a33]">Subtotal</p>
                    <p className="font-serif text-lg text-[#5c4a33]/60 line-through">{fmt(subtotal)}</p>
                  </div>
                )}
                {payments.length > 0 && remaining > 0 && (
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-800">Restante</p>
                    <p className="font-serif text-2xl text-amber-900 font-bold">{fmt(remaining)}</p>
                  </div>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCpfModal(true)}
                  disabled={saleDone}
                  title="F2 - Identificar Cliente"
                  className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    saleDone
                      ? "border-[#b08d57]/10 text-[#c9bfb5] cursor-not-allowed"
                      : cpf || selectedClientId
                      ? "border-[#8c6d45] bg-[#8c6d45] text-white"
                      : "border-[#b08d57]/20 text-[#2a2421] hover:bg-[#f7f2ed]"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{cpf || selectedClientId ? "Identificado" : "Cliente F2"}</span>
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!saleDone}
                  title="F10 - Imprimir Recibo"
                  className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${saleDone ? "border-[#b08d57]/30 text-[#2a2421] hover:bg-[#f7f2ed]" : "border-[#b08d57]/10 text-[#c9bfb5] cursor-not-allowed"}`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Recibo F10</span>
                </button>
                <button
                  onClick={handleNfcePrint}
                  disabled={!saleDone}
                  title="F12 - Emitir NFCe"
                  className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${saleDone ? "border-amber-600/30 text-amber-900 hover:bg-amber-50" : "border-[#b08d57]/10 text-[#c9bfb5] cursor-not-allowed"}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">NFCe F12</span>
                </button>
                <button
                  onClick={() => { void handleCancelSale(); }}
                  disabled={!activeSale || Boolean(activeSale.canceledAt)}
                  className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${activeSale && !activeSale.canceledAt ? "border-red-200 text-red-600 hover:bg-red-50" : "border-[#b08d57]/10 text-[#c9bfb5] cursor-not-allowed"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Cancelar venda</span>
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  disabled={cart.length === 0 || saleDone}
                  className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${cart.length > 0 && !saleDone ? "bg-[#725a38] text-white hover:bg-[#5c4a33] shadow-lg shadow-[#725a38]/20" : "bg-[#f7f2ed] text-[#c9bfb5] cursor-not-allowed"}`}
                >
                  <CreditCard className="h-4 w-4" />
                  {isPaid && !saleDone ? "Ver Pagamento" : "Receber"}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* ── RIGHT: Daily summary sidebar ── */}
        <aside className="w-72 flex-shrink-0 flex flex-col border-l-2 border-[#b08d57]/10 bg-[#faf8f5]/55 backdrop-blur-md overflow-hidden">

          {/* Day summary */}
          <div className="px-4 py-3 border-b border-[#b08d57]/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8c6d45]">Resumo do Dia</p>
          </div>
          <div className="px-4 py-3 border-b border-[#b08d57]/10 space-y-1.5">
            {[
              { label: "PIX", value: dayPix, color: "text-green-700" },
              { label: "Crédito", value: dayCc, color: "text-purple-700" },
              { label: "Débito", value: dayCd, color: "text-blue-700" },
              { label: "Boleto", value: dayBol, color: "text-orange-700" },
              { label: "Dinheiro", value: dayDin, color: "text-amber-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#5c4a33]">{label}</span>
                <span className={`font-black ${color}`}>{fmt(value)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1.5 border-t border-[#b08d57]/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#5c4a33]">Total</span>
              <span className="text-sm font-black text-[#2a2421]">{fmt(dayPix + dayCc + dayCd + dayDin + dayBol)}</span>
            </div>
          </div>

          {/* Cash balance */}
          <div className="px-4 py-3 border-b border-[#b08d57]/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8c6d45] mb-2 flex items-center gap-1.5">
              <Wallet className="h-3 w-3" /> Dinheiro em Caixa
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#5c4a33] flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-600" /> Entradas</span>
                <span className="font-black text-green-700">{fmt(dayDin)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#5c4a33] flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /> Saídas</span>
                <span className="font-black text-red-600">{fmt(totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-[#b08d57]/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5c4a33]">Saldo</span>
                <span className={`text-base font-black ${cashBalance >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(cashBalance)}</span>
              </div>
            </div>
          </div>

          {/* Quick expense */}
          <div className="px-4 py-3 border-b border-[#b08d57]/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8c6d45] mb-2">Lançar Despesa</p>
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }}
              className="space-y-2"
            >
              <input
                type="text"
                placeholder="Descrição (ex: Boy)"
                value={expenseLabel}
                onChange={e => setExpenseLabel(e.target.value)}
                className="w-full rounded-xl border border-[#b08d57]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#2a2421] placeholder-[#c9bfb5] focus:outline-none focus:border-[#8c6d45]"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  className="flex-1 rounded-xl border border-[#b08d57]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#2a2421] placeholder-[#c9bfb5] focus:outline-none focus:border-[#8c6d45]"
                  min="0" step="0.01"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase hover:bg-red-700 transition-all"
                >
                  <Plus className="h-3.5 w-3.5 rotate-45" />
                </button>
              </div>
            </form>

            {/* Expense list */}
            {expenses.length > 0 && (
              <div className="mt-2 space-y-1">
                {expenses.map(e => (
                  <button
                    key={e.id}
                    onClick={() => handleOpenEditExpense(e)}
                    className="w-full flex justify-between text-[10px] hover:bg-[#b08d57]/10 p-1 rounded transition-colors group"
                  >
                    <span className="text-[#a69b8f] truncate mr-2 group-hover:text-[#5c4a33]">{e.label}</span>
                    <span className="font-black text-red-600 flex-shrink-0">- {fmt(e.amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sales log */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8c6d45] mb-2">Vendas do Dia</p>
            {sales.length === 0 && <p className="text-[10px] text-[#c9bfb5]">Nenhuma venda registrada.</p>}
            <div className="space-y-1.5">
              {sales.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleReprintSale(s)}
                  className={`w-full text-left text-[10px] border rounded-xl px-3 py-2 transition-all ${s.canceledAt ? "border-red-100 bg-red-50/65 hover:bg-red-50" : "border-[#b08d57]/10 bg-white hover:border-[#b08d57]/30 hover:bg-[#fdfbf7]"}`}
                >
                  <div className="flex justify-between font-black text-[#2a2421]">
                    <span>{s.time}</span>
                    <span>{fmt(s.total)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-widest">
                    <span className="text-[#8c6d45]">{s.clientName || "Consumidor final"}</span>
                    <span className={`font-black ${s.originType === "conditional" ? "text-amber-700" : "text-[#a69b8f]"}`}>
                      {s.originType === "conditional" ? "Condicional" : "Venda direta"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {s.payments.map((p, i) => (
                        <span key={i} className={`font-bold ${METHOD_COLOR[p.method]}`}>{METHOD_LABEL[p.method]}</span>
                      ))}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.16em] ${s.canceledAt ? "text-red-500" : "text-[#8c6d45]"}`}>
                      {s.canceledAt ? "Cancelada" : "Abrir venda"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Gift Alert Modal ── */}
      {giftAlert && (
        <GiftAlertModal
          productName={giftAlert.productName}
          matches={giftAlert.matches}
          onConfirm={(match) => {
            addToCart(giftAlert.product, { giftMatch: match });
            setGiftAlert(null);
          }}
          onClose={() => { setGiftAlert(null); }}
        />
      )}

      {/* ── Payment Modal ── */}
      {showPayment && (
        <PaymentModal
          remaining={remaining}
          payments={payments}
          onAddPayment={handleAddPayment}
          onClose={() => setShowPayment(false)}
          onFinalize={() => { void handleFinalize(); }}
        />
      )}

      {/* ── Client Identification Modal (F2) ── */}
      {showCpfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#2a2421]/40 backdrop-blur-sm" onClick={() => setShowCpfModal(false)} />
          <div className="relative w-full max-w-md rounded-[2rem] bg-white border-2 border-[#b08d57]/20 shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8c6d45]">Venda Identificada</p>
                <h2 className="font-serif text-2xl text-[#2a2421] mt-1">Identificar Cliente</h2>
                <p className="text-xs text-[#a69b8f] mt-1">Vincule esta compra a um CPF ou cliente cadastrado.</p>
              </div>

              <div className="space-y-4">
                {/* CPF Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#5c4a33]">CPF na Nota</label>
                  <div className="flex items-center gap-2 rounded-2xl border-2 border-[#b08d57]/25 bg-white px-4 py-3 shadow-sm focus-within:border-[#8c6d45] transition-all">
                    <FileText className="h-4 w-4 text-[#b08d57]" />
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={e => setCpf(e.target.value)}
                      className="flex-1 bg-transparent text-base font-bold text-[#2a2421] focus:outline-none placeholder-[#c9bfb5]"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Customer Search */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#5c4a33]">Cliente Cadastrado</label>
                  <div className="space-y-2">
                    {selectedClient ? (
                      <div className="flex items-center justify-between rounded-2xl border border-[#b08d57]/15 bg-[#fdfbf7] px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-[#2a2421]">{selectedClient.name}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">
                            {selectedClient.phone || selectedClient.instagram || "Cliente vinculado"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId("");
                            setClientSearchTerm("");
                          }}
                          className="rounded-full border border-[#b08d57]/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#5c4a33] transition-all hover:bg-[#f7f2ed]"
                        >
                          Limpar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-2xl border-2 border-[#b08d57]/25 bg-white px-4 py-3 shadow-sm focus-within:border-[#8c6d45] transition-all">
                        <Search className="h-4 w-4 text-[#b08d57]" />
                        <input
                          type="text"
                          placeholder="Buscar por nome, telefone, CPF ou Instagram"
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="flex-1 bg-transparent text-sm font-bold text-[#2a2421] focus:outline-none placeholder-[#c9bfb5]"
                        />
                      </div>
                    )}

                    {!selectedClient && normalizedClientNeedle.length >= 2 ? (
                      <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#b08d57]/15 bg-[#fffdfb] p-2">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setClientSearchTerm(client.name);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-all hover:bg-[#f7f2ed]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#2a2421]">{client.name}</p>
                                <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#8c6d45]">
                                  {client.phone || client.instagram || client.cpf || "Sem dado complementar"}
                                </p>
                              </div>
                              {selectedClientId === client.id ? (
                                <span className="rounded-full bg-[#8c6d45] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                                  Selecionado
                                </span>
                              ) : null}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">Nenhum cliente encontrado</p>
                            <p className="mt-1 text-sm text-[#a69b8f]">Tente outro nome, telefone, CPF ou Instagram.</p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setCpf(""); setSelectedClientId(""); setClientSearchTerm(""); setShowCpfModal(false); }} className="flex-1 rounded-2xl border-2 border-[#b08d57]/20 py-3.5 text-xs font-black uppercase tracking-widest text-[#5c4a33] hover:bg-[#f7f2ed] transition-all">
                  Cancelar
                </button>
                <button onClick={() => setShowCpfModal(false)} className="flex-1 rounded-2xl bg-[#8c6d45] py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-[#725a38] transition-all shadow-lg shadow-[#8c6d45]/20">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Expense Modal ── */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#2a2421]/40 backdrop-blur-sm" onClick={() => setEditingExpense(null)} />
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white border-2 border-[#b08d57]/20 shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSaveEditExpense(); }}
              className="flex flex-col gap-4"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Ajustar Saída</p>
                <h2 className="font-serif text-2xl text-[#2a2421] mt-1">Editar Despesa</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#5c4a33]">Descrição</label>
                  <input
                    type="text"
                    value={editExpenseLabel}
                    onChange={e => setEditExpenseLabel(e.target.value)}
                    className="w-full rounded-2xl border-2 border-[#b08d57]/25 bg-white px-4 py-3 text-sm font-bold text-[#2a2421] focus:outline-none focus:border-[#8c6d45]"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#5c4a33]">Valor</label>
                  <div className="flex items-center gap-2 rounded-2xl border-2 border-[#b08d57]/25 bg-white px-4 py-2 shadow-sm">
                    <span className="text-[#a69b8f] font-bold text-sm">R$</span>
                    <input
                      type="number"
                      value={editExpenseAmount}
                      onChange={e => setEditExpenseAmount(e.target.value)}
                      className="flex-1 bg-transparent text-lg font-black text-[#2a2421] focus:outline-none"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#8c6d45] py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-[#725a38] transition-all"
                >
                  Salvar Alterações
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(null)}
                    className="flex-1 rounded-2xl border-2 border-[#b08d57]/20 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#5c4a33] hover:bg-[#f7f2ed]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteExpense}
                    className="flex-1 rounded-2xl bg-red-50 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}








