import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { ean: string } }
) {
  const ean = params.ean;
  const cosmosToken = process.env.COSMOS_TOKEN ?? process.env.NEXT_PUBLIC_COSMOS_TOKEN;

  if (!cosmosToken) {
    return NextResponse.json(
      { error: "COSMOS_TOKEN não configurado no ambiente do servidor." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${ean}.json`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Cosmos-Token": cosmosToken,
        "User-Agent": "MBGifts-Inventory-Service"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erro na API Cosmos: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro no Proxy Cosmos:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar no Cosmos" },
      { status: 500 }
    );
  }
}
