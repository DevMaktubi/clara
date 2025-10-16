# Architecture Prompt

O projeto usa **Electron 33+**, **Node.js 20+**, e **HTML/CSS(Tailwind)/JS**.

## Estrutura de diretórios

src/
├─ main/ → código principal (processo principal do Electron)
├─ renderer/ → interface (HTML, JS, CSS)
├─ preload/ → comunicação segura
└─ assets/ → ícones e estilos

## Padrões
- Cada camada deve ser isolada (sem imports cruzados).
- Comunicação entre `renderer` e `main` via **IPC**.
- Nenhum acesso direto a `fs` no front-end.
- Lógica de renomear arquivos fica em um módulo dedicado: `src/main/rename.js`.
- O app precisa ser empacotável via `electron-builder`.

## Segurança
- `contextIsolation: true`
- `nodeIntegration: false`
- Sem uso de `eval` ou `innerHTML` dinâmico.

## Dependências essenciais
- `"electron": "^33.0.0"`
- `"electron-builder": "^25.0.0"`

## Estilo de UI
- Layout minimalista, fundo branco, tipografia clara.
- Botões grandes e centralizados.
- Foco em acessibilidade (tabindex, labels).

