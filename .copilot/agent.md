# 🤖 CLARA Agent — Documento de Contexto e Protótipo Inicial

## 💡 Motivação do Projeto

O projeto **CLARA** nasceu de uma necessidade real e cotidiana: ajudar **Ana Clara**, estudante e pesquisadora, a organizar milhares de arquivos digitalizados provenientes de pesquisas na **[hemeroteca digital da biblioteca nacional](https://bndigital.bn.gov.br/hemeroteca-digital/)**

Ao terminar de baixar todos os arquivos necessários para realizar a pesquisa dela, ela precisava organizá-los cronologicamente, a solução inicial foi um **script em PowerShell**, que funcionava, mas exigia um domínio técnico para execução.  
O próximo passo natural foi transformar essa automação em um **aplicativo acessível, visual e multiplataforma**, capaz de ajudar qualquer pessoa a realizar o mesmo processo de forma intuitiva.

Assim nasceu o **Projeto CLARA** — *Classificador Leve e Automático de Recursos Arquivísticos.*

---

## 🧩 Protótipo Inicial

O protótipo de CLARA deve manter a lógica do script original, mas com:
- Interface gráfica (Electron.js);
- Parâmetros configuráveis (pasta, extensão, data, número inicial);
- Logs visuais;
- Segurança e empacotamento (para gerar `.exe` e `.dmg`).

O comportamento inicial do app deve seguir este fluxo:

1. O usuário escolhe a **pasta** de arquivos;
2. Define o **número inicial** do contador;
3. Define a **extensão** a ser processada (`.jpeg`, `.png`, etc.);
4. O app **extrai datas e páginas** dos nomes dos arquivos;
5. Ordena os arquivos cronologicamente;
6. Renomeia cada arquivo com numeração crescente (ex: `0001 OESP 15-08-1942 p3.jpeg`);
7. Exibe logs e permite desfazer a operação, se possível.

---

## 🧾 Código Original — Script PowerShell

O código abaixo representa a **primeira versão funcional** do projeto, escrita por Breno em PowerShell:

```powershell
# Caminho fixo para a pasta com os arquivos
$pasta = "C:\Users\Professor\OneDrive\Mestrado\Fontes Mestrado\script"

# Função para extrair data e página do nome do arquivo
function ExtrairDataEPagina {
    param (
        [string]$nomeArquivo
    )
    try {
        # Remover a extensão do arquivo
        $nomeSemExtensao = [System.IO.Path]::GetFileNameWithoutExtension($nomeArquivo)
        
        # Dividir o nome do arquivo
        $partes = $nomeSemExtensao -split '\s|\.'
        
        # Verificar se as partes têm o formato esperado
        if ($partes.Length -lt 4) {
            Write-Host "Formato inesperado do nome do arquivo: $nomeArquivo"
            return $null
        }
        
        # Extrair data e página
        $dataString = $partes[1]
        $paginaString = $partes[-1]
        
        # Validar a data
        $data = [datetime]::MinValue
        $dataFormat = 'dd-MM-yyyy'
        
        # Usar TryParseExact com a assinatura correta
        $dataConvertida = [datetime]::TryParseExact(
            $dataString,
            $dataFormat,
            [System.Globalization.CultureInfo]::InvariantCulture,
            [System.Globalization.DateTimeStyles]::None,
            [ref]$data
        )
        
        if (-not $dataConvertida -or $data -eq [datetime]::MinValue) {
            Write-Host "Data inválida: $dataString"
            return $null
        }
        
        # Converter página para número inteiro
        $pagina = [int]$paginaString

        return [pscustomobject]@{ Data = $data; Pagina = $pagina; Nome = $nomeArquivo }
    } catch {
        Write-Host "Erro ao processar o arquivo: $_"
        return $null
    }
}

# Solicitar número inicial do contador ao usuário
$contadorInicial = Read-Host "Digite o número inicial do contador"

# Validar se o número inicial do contador é um número inteiro
if (-not [int]::TryParse($contadorInicial, [ref]$contadorInicial)) {
    Write-Host "Número inicial do contador inválido. O script será encerrado."
    exit
}

# Obter todos os arquivos da pasta e extrair data e página
$arquivos = Get-ChildItem -Path $pasta | Where-Object { $_.Extension -eq ".jpeg" } | ForEach-Object { 
    ExtrairDataEPagina -nomeArquivo $_.Name
} | Where-Object { $_ -ne $null }

# Ordenar os arquivos pela data e pela página
$arquivosOrdenados = $arquivos | Sort-Object Data, Pagina

# Renomear arquivos com números crescentes
foreach ($arquivo in $arquivosOrdenados) {
    try {
        # Formatar o número com zeros à esquerda se for menor que 1000
        if ($contadorInicial -lt 1000) {
            $novoNome = "{0:D4} {1}" -f $contadorInicial, $arquivo.Nome
        } else {
            $novoNome = "{0} {1}" -f $contadorInicial, $arquivo.Nome
        }
        
        # Criar o caminho completo para o novo nome
        $caminhoNovoNome = Join-Path -Path $pasta -ChildPath $novoNome

        # Renomear o arquivo
        Rename-Item -Path (Join-Path -Path $pasta -ChildPath $arquivo.Nome) -NewName $caminhoNovoNome
        
        # Incrementar o contador
        $contadorInicial++
    } catch {
        Write-Host "Erro ao renomear o arquivo $($arquivo.Nome): $_"
        break
    }
}

Write-Host "Processamento concluído."
```

