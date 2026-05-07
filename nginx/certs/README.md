# Certificado de origem (Cloudflare Origin CA)

Coloque aqui:

- `origin.pem` — certificado (cole o bloco "Origin Certificate" da Cloudflare)
- `origin.key` — chave privada gerada junto com o certificado

## Como gerar (uma única vez)

1. Cloudflare → seu domínio → SSL/TLS → **Origin Server** → "Create Certificate".
2. Hostnames: `*.gunz.com.br, gunz.com.br`.
3. Validade: 15 anos (padrão).
4. Salve o **Origin Certificate** em `nginx/certs/origin.pem`.
5. Salve o **Private Key** em `nginx/certs/origin.key`.
6. Em SSL/TLS → Overview, troque o modo para **Full (strict)**.
7. SSL/TLS → Edge Certificates → ative **Always Use HTTPS**.

## Importante

- Os arquivos `*.pem` e `*.key` são ignorados pelo `.gitignore` — nunca commite.
- Permissões no VPS: `chmod 600 origin.key` (não obrigatório dentro do container,
  mas boa prática se editar no host).
