from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "cliente" / "mbgifts_apresentacao_cliente.pdf"


def bullet(text: str) -> Paragraph:
    return Paragraph(f"&bull; {escape(text)}", styles["Body"])


def panel_table(rows, col_widths=None):
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffdfa")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#d9c3a5")),
                ("INNERGRID", (0, 0), (-1, -1), 0, colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return table


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="Eyebrow",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#8c6d45"),
        spaceAfter=6,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="HeroTitle",
        parent=styles["Title"],
        fontName="Times-Roman",
        fontSize=28,
        leading=32,
        textColor=colors.HexColor("#2a2421"),
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionTitle",
        parent=styles["Heading2"],
        fontName="Times-Roman",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#2a2421"),
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="CardTitle",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2a2421"),
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor("#3b342f"),
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallCaps",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#8c6d45"),
        spaceAfter=4,
    )
)


doc = SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=16 * mm,
    rightMargin=16 * mm,
    topMargin=16 * mm,
    bottomMargin=16 * mm,
)

story = []

story.extend(
    [
        Paragraph("Apresentação funcional", styles["Eyebrow"]),
        Paragraph("MBGifts", styles["HeroTitle"]),
        Paragraph(
            "Plataforma para gestão de loja de presentes com operação elegante, experiência premium e estrutura preparada para crescimento.",
            styles["Body"],
        ),
        Spacer(1, 8),
        panel_table(
            [
                [Paragraph("Visão executiva", styles["Eyebrow"])],
                [
                    Paragraph(
                        "O sistema já demonstra os fluxos centrais da rotina comercial de uma loja de presentes, com foco em organização, atendimento e clareza operacional. Nesta próxima etapa entram a persistência real dos dados, a segurança por tenant e a personalização dinâmica de cada loja.",
                        styles["Body"],
                    )
                ],
                [Paragraph("MBGifts", styles["SmallCaps"])],
            ],
            col_widths=[178 * mm],
        ),
        Spacer(1, 12),
        panel_table(
            [
                [
                    Paragraph("Produtos", styles["SmallCaps"]),
                    Paragraph("Clientes", styles["SmallCaps"]),
                    Paragraph("Caixa", styles["SmallCaps"]),
                ],
                [
                    Paragraph("Condicionais", styles["SmallCaps"]),
                    Paragraph("Listas de Eventos", styles["SmallCaps"]),
                    Paragraph("Etiquetas", styles["SmallCaps"]),
                ],
            ],
            col_widths=[58 * mm, 58 * mm, 58 * mm],
        ),
        PageBreak(),
        Paragraph("O que já pode ser apresentado", styles["Eyebrow"]),
        Paragraph("Visão geral da operação", styles["SectionTitle"]),
        panel_table(
            [
                [
                    Paragraph("<b>Painel inicial</b><br/>Acesso rápido aos módulos principais da operação, com organização visual adequada para o uso diário da equipe da loja.", styles["Body"]),
                    Paragraph("<b>Caixa</b><br/>Fluxo de venda com carrinho, desconto, múltiplas formas de pagamento e integração com listas de presentes.", styles["Body"]),
                ],
                [
                    Paragraph("<b>Gestão de produtos</b><br/>Cadastro, edição, controle visual de estoque, reserva por condicional e apoio à identificação por EAN, QR Code e código de barras.", styles["Body"]),
                    Paragraph("<b>Condicionais</b><br/>Abertura da retirada, emissão de recibo, revisão de devolução e transformação parcial ou total em venda.", styles["Body"]),
                ],
                [
                    Paragraph("<b>Gestão de clientes</b><br/>Cadastro, atualização e acompanhamento de clientes, incluindo status de confiança para condicional e atalhos para operação comercial.", styles["Body"]),
                    Paragraph("<b>Listas de eventos</b><br/>Experiência separada para anfitrião e convidado, com estrutura pronta para compartilhamento e acompanhamento dos itens.", styles["Body"]),
                ],
            ],
            col_widths=[88 * mm, 88 * mm],
        ),
        Spacer(1, 12),
        panel_table(
            [
                [
                    Paragraph("<b>Etiquetas premium</b><br/>Geração de QR Code e código de barras para identificação física dos itens da loja.", styles["Body"]),
                    Paragraph("<b>Configurações</b><br/>Base administrativa pronta para concentrar identidade da loja, dados fiscais e personalização do tenant.", styles["Body"]),
                ],
                [
                    Paragraph("<b>Experiência mobile</b><br/>Navegação e fluxos pensados para operação em telas menores e apoio à bipagem.", styles["Body"]),
                    Paragraph("<b>Estrutura multi-loja</b><br/>Arquitetura já preparada para evolução com múltiplas lojas e identidade própria por empresa.", styles["Body"]),
                ],
            ],
            col_widths=[88 * mm, 88 * mm],
        ),
        PageBreak(),
        Paragraph("Fluxos demonstráveis", styles["Eyebrow"]),
        Paragraph("Como a operação já pode funcionar", styles["SectionTitle"]),
    ]
)

steps = [
    ("Produtos e identificação", "O time pode cadastrar itens, localizar por busca ou código, revisar estoque e gerar etiquetas com QR Code e código de barras."),
    ("Clientes e relacionamento", "O sistema organiza o cadastro do cliente e permite indicar quem está habilitado para condicional, facilitando a tomada de decisão no atendimento."),
    ("Venda no caixa", "O operador pode montar carrinho, ajustar quantidades, aplicar desconto e registrar pagamentos múltiplos em um fluxo simples e visual."),
    ("Condicional com conversão em venda", "Na retirada, a loja registra os itens levados pelo cliente e gera recibo. Na devolução, decide item a item o que volta e o que segue para venda."),
    ("Listas de eventos", "O anfitrião organiza os itens da lista e o convidado acessa uma experiência dedicada para escolher presentes com mais clareza."),
]

for index, (title, description) in enumerate(steps, start=1):
    badge = Paragraph(str(index), styles["CardTitle"])
    story.append(
        panel_table(
            [[badge, Paragraph(f"<b>{escape(title)}</b><br/>{escape(description)}", styles["Body"])]],
            col_widths=[12 * mm, 166 * mm],
        )
    )
    story.append(Spacer(1, 6))

story.extend(
    [
        PageBreak(),
        Paragraph("Diferenciais percebidos", styles["Eyebrow"]),
        Paragraph("O valor já visível nesta etapa", styles["SectionTitle"]),
        panel_table(
            [
                [
                    Paragraph("<b>Elegância operacional</b><br/>O sistema foi desenhado para traduzir sofisticação na rotina da loja, sem perder objetividade nos fluxos do dia a dia.", styles["Body"]),
                    Paragraph("<b>Preparação para crescer</b><br/>A base já foi pensada para múltiplas lojas, com personalização da identidade e evolução para dados reais em banco.", styles["Body"]),
                ],
                [
                    Paragraph("<b>Clareza visual</b><br/>O atendimento ganha mais segurança com telas organizadas, leitura rápida das ações e navegação consistente entre módulos.", styles["Body"]),
                    Paragraph("<b>Implantação progressiva</b><br/>A experiência atual já permite demonstrar a lógica completa da operação, enquanto a próxima fase consolida persistência, segurança e automações.", styles["Body"]),
                ],
            ],
            col_widths=[88 * mm, 88 * mm],
        ),
        Spacer(1, 12),
        panel_table(
            [
                [Paragraph("Nota de implantação", styles["Eyebrow"])],
                [
                    Paragraph(
                        "O sistema já está estruturado visual e funcionalmente para demonstrar os principais fluxos da loja. Na próxima etapa entram a persistência real dos dados, a segurança por tenant e a configuração dinâmica da identidade da empresa por meio do banco.",
                        styles["Body"],
                    )
                ],
                [
                    Paragraph(
                        "Este material apresenta apenas o que já é demonstrável hoje, sem antecipar como concluído o que ainda depende da implantação de backend e persistência real.",
                        styles["Body"],
                    )
                ],
                [Paragraph("MBGifts", styles["SmallCaps"])],
            ],
            col_widths=[178 * mm],
        ),
    ]
)

doc.build(story)
print(f"PDF gerado em: {OUT}")
