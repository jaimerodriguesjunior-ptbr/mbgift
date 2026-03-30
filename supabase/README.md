## Supabase

Este diretório guarda a base da implantação real do MBGifts.

### Convenções desta fase

- `tenant_id` é obrigatório em todas as tabelas de negócio.
- `tenants` é a fonte oficial da identidade visual e cadastral da loja.
- RLS fica habilitado desde a migration inicial.
- O bootstrap de tenant deve acontecer por função server-side ou service role.

### Variáveis esperadas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COSMOS_TOKEN`

### Próximo passo natural

Conectar `Configurações` e os módulos de domínio ao schema abaixo sem reaproveitar hardcodes de `Le Blanc`.
