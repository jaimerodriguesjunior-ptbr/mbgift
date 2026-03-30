"use client";

import { Product } from '@/types';
import LabelItem from './LabelItem';
import { X, Printer } from 'lucide-react';

interface LabelSheetProps {
  items: { product: Product; quantity: number }[];
  onClose: () => void;
  storeLabel: string;
}

export default function LabelSheet({ items, onClose, storeLabel }: LabelSheetProps) {
  // Flatten items into a single array based on quantity
  const allLabels = items.flatMap(item => 
    Array.from({ length: item.quantity }, () => item.product)
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-auto flex flex-col">
      {/* Control Header - Hidden during print */}
      <div className="print:hidden p-4 bg-[#f8f5f2] border-b border-[#b08d57]/20 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-[#5c4a33]" />
          </button>
          <div>
            <h3 className="font-serif text-xl text-[#2a2421]">Visualização de Impressão</h3>
            <p className="text-[10px] uppercase tracking-widest text-[#8c6d45] font-bold">
              {allLabels.length} etiquetas prontas • Tamanho aproximado: 38mm x 21mm
            </p>
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="rounded-full bg-[#8c6d45] px-6 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-[#725a38] transition-all flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimir Folha
        </button>
      </div>

      {/* Sheet Content */}
      <div className="flex-1 bg-gray-100 p-8 print:bg-white print:p-0 flex justify-center">
        <div className="bg-white print:bg-white p-4 print:p-0 shadow-2xl print:shadow-none w-[21cm] min-h-[29.7cm] flex flex-col">
          {/* Label Grid - Standard 3 col grid for labels */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-1 content-start">
            {allLabels.map((product, idx) => (
              <LabelItem key={`${product.id}-${idx}`} product={product} storeLabel={storeLabel} />
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* Ensure only the sheet content is visible during print */
          .print\:bg-white, .print\:bg-white * {
            visibility: visible;
          }
          .print\:bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
