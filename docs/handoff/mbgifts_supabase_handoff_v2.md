# MBGifts: Handoff Consolidado para Implantação Real

## 1. Objetivo deste documento

Este é o handoff consolidado para iniciar a implantação real do projeto em outro contexto, substituindo a base mockada por persistência em banco de dados e preparando o sistema para operação multi-tenant.

Este documento substitui versões anteriores do handoff que tratavam `Le Blanc` como se fosse o próprio sistema. Essa premissa não é mais válida.

---

## 2. Identidade correta do produto

### Plataforma
- Nome do sistema: `MBGifts`

### Tenant / loja cliente
- `Le Blanc` é apenas a primeira loja cliente.
- O sistema não pode tratar `Le Blanc` como marca fixa da plataforma.
- Nome, logo, tagline, paleta e identidade visual da loja devem vir do tenant salvo no banco.

### Regra de branding
- Painel interno: pode exibir loja atual + assinatura discreta da plataforma.
- Rodapé ou assinatura do painel: pode usar `MBGifts` como marca da plataforma.
- Telas públicas da loja: por padrão devem mostrar apenas a identidade do tenant.
- Todo `Le Blanc`, `LEBLANC` ou similar hardcoded na UI deve ser tratado como dívida técnica e removido.

---

## 3. Regras de linguagem e encoding

### Regra funcional
- Acentos importam na interface.
- O texto da UI deve estar em português correto:
  - `Gestão`
  - `Relatórios`
  - `Configurações`
  - `Observações`
  - `Devolução`
  - `Não definido`

### Regra técnica
- Código técnico pode permanecer em ASCII:
  - nomes de arquivos
  - nomes de pastas
  - rotas
  - ids
  - nomes de colunas
  - chaves de objetos
- Exemplo esperado:
  - rota: `/relatorio`
  - label na UI: `Relatório`

### Situação real identificada
- Parte dos arquivos está corretamente em UTF-8.
- O terminal do Windows/PowerShell às vezes exibe mojibake, então ele não é fonte confiável para revisão textual.
- Também existem alguns pontos realmente degradados no fonte, então o problema não é apenas visual.

### Regra obrigatória para implantação
- Ortografia PT-BR correta é bloqueador formal.
- Encoding UTF-8 precisa ser tratado como requisito de qualidade, não como detalhe final.

---

## 4. Estado real do repositório hoje

### Base já existente
- Stack:
  - Next.js 14
  - React 18
  - Tailwind CSS
  - Lucide React
  - qrcode.react
- Tipos centralizados em `src/types/index.ts`
- Store mockada central em `src/lib/mock-store.ts`
- Documento comercial para cliente em `docs/cliente`

### Módulos já demonstráveis no mock
- Dashboard
- Produtos
- Clientes
- Caixa
- Condicionais
- Listas de Eventos
- Configurações
- Etiquetas com QR Code e código de barras

### Fluxos já implementados e demonstráveis
- Gestão de produtos
- Busca por EAN
- Cadastro e edição de clientes
- Caixa com carrinho e múltiplos pagamentos
- Integração do caixa com listas de presentes
- Abertura de condicional
- Impressão de recibo de retirada em condicional
- Revisão de devolução
- Conversão parcial ou total de condicional em venda
- Fluxo de lista com visão de anfitrião e convidado

### Limitação importante
- O projeto ainda está fortemente acoplado ao mock em alguns pontos.
- A migração para Supabase não será apenas “trocar um hook”.

---

## 5. Realidade técnica que invalida o handoff antigo como documento final

Os pontos abaixo foram verificados diretamente no repositório:

### Dependências ainda diretas de `mock-data`
- `src/lib/mock-store.ts`
- `src/components/products/ProductCard.tsx`
- `src/components/listas/ListaItem.tsx`
- `src/components/listas/ListaCard.tsx`
- `src/components/listas/GiftListMaster.tsx`
- `src/components/listas/GiftListDetail.tsx`
- `src/components/layout/Header.tsx`
- `src/app/lista-publica/[slug]/page.tsx`
- `src/app/(painel)/caixa/page.tsx`
- `src/app/(painel)/listas/[id]/page.tsx`
- `src/app/lista/[slug]/page.tsx`
- `src/app/(painel)/listas/novo/page.tsx`
- `src/app/(painel)/listas/page.tsx`
- `src/app/lista/[slug]/editar/page.tsx`

### Hardcodes de marca ainda existentes
Há hardcodes de `Le Blanc` em páginas e componentes do painel, listas públicas, recibos, placeholders e elementos visuais. Isso precisa ser removido antes da implantação real.

### Camada mock atual
O `useMockStore` é útil como base de transição, mas ainda é a fonte central de estado para produtos, clientes, vendas e condicionais.

Conclusão:
- o handoff antigo ainda vale como direção
- não vale mais como documento de execução sem reescrita

---

## 6. Estrutura de dados atual já mapeada

Hoje `src/types/index.ts` já define os principais modelos:
- `Product`
- `Client`
- `GiftList`
- `GiftListItem`
- `SaleRecord`
- `ConditionalRecord`
- `ConditionalItem`
- `CheckoutDraft`
- `Tenant`

Também já existe `tenant_id?` em vários tipos, o que ajuda na migração.

### Observação importante
O tipo atual `Tenant` ainda é insuficiente para implantação real. Ele cobre branding básico, mas precisa evoluir para dados de empresa, identidade e operação fiscal.

---

## 7. Arquitetura alvo

### Estratégia multi-tenant
- Banco compartilhado com `tenant_id` em todas as tabelas de negócio
- RLS no Supabase
- Contexto visual da loja por tenant
- Autorização baseada em sessão + associação do usuário ao tenant

### Regra de segurança
- A URL pode ajudar a determinar contexto visual
- A autorização real não deve depender apenas da URL
- Deve existir vínculo formal entre usuário e tenant

### Recomendação de modelagem
Criar no mínimo:
- `tenants`
- `profiles`
- `tenant_memberships`
- `products`
- `clients`
- `gift_lists`
- `gift_list_items`
- `gift_list_messages`
- `conditionals`
- `conditional_items`
- `sales`
- `sale_items`
- `sale_payments`

### Regras de banco
- `tenant_id` obrigatório em todas as tabelas de negócio
- unicidade por tenant quando fizer sentido
- modelagem relacional suficiente para estoque, venda, pagamento, condicional e relatório

---

## 8. Papel da tela Configurações

Hoje a tela `Configurações` ainda é majoritariamente visual.

Na implantação real, ela deve virar a fonte oficial da identidade da loja.

### Campos mínimos esperados para o tenant
- `id`
- `slug`
- `business_name`
- `display_name`
- `logo_label`
- `tagline`
- `primary_color`
- `secondary_color`
- `contact_email`
- `contact_phone`
- `document_cnpj`
- `address`
- dados fiscais adicionais conforme necessidade

### Regra de consumo
- painel
- listas públicas
- recibos
- impressões
- cabeçalhos
- metas e títulos dinâmicos

Tudo isso deve passar a ler a identidade da loja pelo tenant, e não por constantes fixas.

---

## 9. Estratégia recomendada de implantação

### Fase 0: saneamento obrigatório antes do banco
- remover hardcodes de `Le Blanc` como marca da plataforma
- separar branding de plataforma e branding de tenant
- padronizar textos visíveis com português correto
- formalizar UTF-8 no repositório
- criar verificação para detectar:
  - mojibake
  - grafias degradadas
  - labels incorretos de UI

### Fase 1: modelagem e segurança no Supabase
- criar schema real multi-tenant
- criar `tenant_memberships`
- ativar RLS
- garantir unicidade por tenant onde necessário

### Fase 2: camada de dados
- criar camada Supabase paralela ao mock
- não trocar tudo de uma vez
- migrar por domínio:
  1. produtos
  2. clientes
  3. condicionais
  4. vendas/caixa
  5. listas e telas públicas

### Fase 3: tenant em runtime
- implementar `TenantProvider`
- fornecer tenant atual para a UI
- fazer branding da loja vir de dados reais

### Fase 4: QA de implantação
- QA funcional por módulo
- QA de branding
- QA de ortografia
- QA multi-tenant

---

## 10. Critérios de aceite da implantação

### Branding
- nenhuma tela deve tratar `Le Blanc` como nome do sistema
- `MBGifts` é o produto
- nome da loja passa a vir do tenant

### Linguagem
- UI sem `Gestao`, `Relatorios`, `Configuracoes`, `Observacoes`, `Nao`
- UI sem mojibake como `GestÃ£o`
- arquivos, rotas e colunas podem continuar em ASCII

### Multi-tenant
- tenant A não acessa dados do tenant B
- identidade visual da loja muda por tenant
- slugs, eans e documentos respeitam regras por tenant

### Funcional
- produtos continuam editáveis
- clientes continuam editáveis
- caixa continua fechando venda
- condicional continua abrindo, revisando e enviando ao caixa
- listas continuam com visão pública e de anfitrião

---

## 11. O que não deve ser prometido como pronto

Enquanto a implantação real não for concluída, o sistema não deve ser comunicado como tendo:
- persistência definitiva em banco
- autenticação multi-tenant finalizada
- RLS já consolidado em produção
- fiscal em produção
- automações totalmente conectadas ao backend real

O correto é comunicar:
- base visual e funcional já estruturada
- próxima fase focada em persistência, segurança e tenant real

---

## 12. Materiais auxiliares já existentes

### Documento comercial para cliente
- `docs/cliente/mbgifts_apresentacao_cliente.md`
- `docs/cliente/mbgifts_apresentacao_cliente.html`
- `docs/cliente/mbgifts_apresentacao_cliente.pdf`

### Diagramas Mermaid
- `docs/cliente/mermaid/visao-geral-modulos.mmd`
- `docs/cliente/mermaid/fluxo-caixa.mmd`
- `docs/cliente/mermaid/fluxo-condicional.mmd`
- `docs/cliente/mermaid/fluxo-lista-eventos.mmd`

Esses materiais são úteis para onboarding funcional, mas não substituem o presente handoff técnico.

---

## 13. Resumo executivo final

O projeto já tem uma base funcional relevante e pronta para demonstração, mas ainda não está em estado de “troca simples” para Supabase.

As premissas corretas para a próxima implementação são:
- `MBGifts` é a plataforma
- `Le Blanc` é tenant
- UI com português correto é requisito formal
- código técnico pode continuar em ASCII
- `Configurações` deve se tornar a fonte oficial da identidade da loja
- a implantação precisa começar por saneamento de branding, linguagem e acoplamentos ao mock

Este documento deve ser tratado como a nova base oficial para começar a implementação em outro contexto.
