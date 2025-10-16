import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class Renamer extends EventEmitter {
  constructor() {
    super();
    this._operations = new Map();
  }

  log(message) {
    const stamp = new Date().toISOString();
    this.emit('log', `[${stamp}] ${message}`);
  }

  async scan({ dir, extension }) {
    this.log(`Escaneando diretório: ${dir} (ext=${extension || 'qualquer'})`);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => this._matchExt(name, extension));

    const parsed = files
      .map((name) => {
        const info = this.extractData(name);
        return info ? { ...info, name } : null;
      })
      .filter(Boolean);

    parsed.sort((a, b) => {
      const t = a.date.getTime() - b.date.getTime();
      if (t !== 0) return t;
      return (a.page ?? 0) - (b.page ?? 0);
    });

    this.log(`Encontrados ${parsed.length} arquivos correspondentes com dados de data/página válidos.`);
    return { total: files.length, matched: parsed.length, items: parsed };
  }

  async run({ dir, extension, startNumber }) {
    this.log(`Iniciando renomeação: dir=${dir}, ext=${extension}, inicio=${startNumber}`);
    const scan = await this.scan({ dir, extension });
    if (scan.items.length === 0) {
      this.log('Nenhum arquivo para renomear.');
      return { operationId: null, renamed: 0, mappings: [] };
    }

    let counter = Number(startNumber ?? 1);
    if (!Number.isInteger(counter) || counter < 0) counter = 1;

    const mappings = [];
    for (const item of scan.items) {
      const oldName = item.name;
      const padded = this._formatNumber(counter);
      const newName = `${padded} ${oldName}`;
      const oldPath = path.join(dir, oldName);
      const newPath = path.join(dir, newName);

      try {
        await fs.rename(oldPath, newPath);
        mappings.push({ oldPath, newPath });
        this.log(`Renomeado: "${oldName}" -> "${newName}"`);
        counter++;
      } catch (err) {
        this.log(`ERRO ao renomear "${oldName}": ${err.message}`);
      }
    }

    const operationId = crypto.randomUUID();
    this._operations.set(operationId, {
      dir,
      createdAt: new Date().toISOString(),
      mappings
    });

    const undoFile = path.join(dir, '.clara-last-rename.json');
    try {
      await fs.writeFile(undoFile, JSON.stringify({ operationId, mappings }, null, 2), 'utf8');
      this.log(`Dados de desfazer salvos em ${path.basename(undoFile)}`);
    } catch (e) {
      this.log(`AVISO: Não foi possível gravar arquivo de desfazer: ${e.message}`);
    }

    return { operationId, renamed: mappings.length, mappings };
  }

  async undo({ operationId }) {
    let op = null;

    if (operationId && this._operations.has(operationId)) {
      op = this._operations.get(operationId);
    } else if (!operationId) {
      if (this._operations.size > 0) {
        const keys = Array.from(this._operations.keys());
        op = this._operations.get(keys[keys.length - 1]);
        operationId = keys[keys.length - 1];
      }
    }

    if (!op) {
      return { undone: 0, errors: ['Nenhuma operação para desfazer.'], operationId: null };
    }

    const results = { undone: 0, errors: [], operationId };
    for (const { oldPath, newPath } of [...op.mappings].reverse()) {
      try {
        const targetDir = path.dirname(oldPath);
        const targetBase = path.basename(oldPath);

        let finalTarget = oldPath;
        try {
          await fs.access(oldPath);
          const parsed = path.parse(oldPath);
          finalTarget = path.join(targetDir, `${parsed.name} (restore)${parsed.ext}`);
        } catch {
        }

        await fs.rename(newPath, finalTarget);
        this.log(`Desfazer: "${path.basename(newPath)}" -> "${path.basename(finalTarget)}"`);
        results.undone++;
      } catch (e) {
        this.log(`ERRO ao desfazer "${path.basename(newPath)}": ${e.message}`);
        results.errors.push(e.message);
      }
    }

    return results;
  }

  extractData(filename) {
    // Strict pattern: ... <space> DD-MM-YYYY.p.NUMERO.ext (page immediately before final extension)
    // Example: "AT 09-10-1941.p.1.jpeg"
    const match = filename.match(/\s(\d{2})-(\d{2})-(\d{4})\.p\.(\d+)\.[^.]+$/);
    if (!match) return null;
    const [, dd, mm, yyyy, pageStr] = match;

    const dateIso = `${yyyy}-${mm}-${dd}T00:00:00Z`;
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) return null;

    const page = parseInt(pageStr, 10);
    if (!Number.isInteger(page)) return null;

    return { date, page };
  }

  _matchExt(name, extension) {
    if (!extension) return true;
    let ext = extension.trim().toLowerCase();
    if (!ext) return true;
    if (!ext.startsWith('.')) ext = `.${ext}`;
    return name.toLowerCase().endsWith(ext);
  }

  _formatNumber(n) {
    if (n < 1000) return String(n).padStart(4, '0');
    return String(n);
  }
}
