"use client";

import { QRCodeSVG } from "qrcode.react";

import { Product } from "@/types";

interface LabelItemProps {
  product: Product;
  storeLabel: string;
}

export default function LabelItem({ product, storeLabel }: LabelItemProps) {
  const qrValue = product.ean || product.id;

  return (
    <div className="flex h-[2.1cm] w-[3.8cm] flex-col justify-between overflow-hidden border border-gray-100 bg-white p-1 shadow-sm transition-shadow hover:shadow-md">
      <div className="text-center w-full">
        <p className="mb-0.5 truncate text-[7px] font-black uppercase leading-none tracking-[0.3em] text-[#8c6d45]">{storeLabel}</p>
        <p className="text-[6px] text-gray-400 leading-none truncate px-1">{product.name}</p>
      </div>

      <div className="flex w-full items-center justify-between gap-1 px-1">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-sm bg-white">
          <QRCodeSVG
            value={qrValue}
            size={34}
            level="M"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#1f1a17"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-serif text-[11px] font-bold text-[#2a2421] leading-none">
            {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="mt-1 truncate text-[5px] font-bold uppercase tracking-widest text-gray-400 font-sans">QR {qrValue}</p>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[#b08d57]/10 mt-auto" />
    </div>
  );
}
