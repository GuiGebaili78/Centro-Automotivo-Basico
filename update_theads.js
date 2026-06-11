const fs = require('fs');
const filePath = 'client/src/pages/FechamentoFinanceiroPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize everything to \n first
content = content.replace(/\r\n/g, '\n');

let table1TheadOld = `              <thead>
                <tr>
                  <th className="w-[12%]">OS / Data</th>
                  <th className="w-[18%]">Cliente</th>
                  <th className="w-[20%]">Veículo / Peça</th>
                  <th className="w-[22%]">Defeito / Diagnóstico</th>
                  <th className="w-[12%]">Técnico</th>
                  <th className="w-[9%] text-center">Status</th>
                  <th className="w-[7%] text-right">Ação</th>
                </tr>
              </thead>`;
table1TheadOld = table1TheadOld.replace(/\r\n/g, '\n');

let table1TheadNew = `              <thead>
                <tr>
                  <th className="w-[12%]">OS / Data</th>
                  <th className="w-[20%]">Veículo / Peça</th>
                  <th className="w-[22%]">Defeito Relatado</th>
                  <th className="w-[12%]">Técnico</th>
                  <th className="w-[18%]">Cliente</th>
                  <th className="w-[9%] text-center">Status</th>
                  <th className="w-[7%] text-right">Ações</th>
                </tr>
              </thead>`;
table1TheadNew = table1TheadNew.replace(/\r\n/g, '\n');

if(content.includes(table1TheadOld)) {
  content = content.replace(table1TheadOld, table1TheadNew);
}

let table2TheadOld = `            <thead>
              <tr>
                <th className="w-[12%]">OS / Data</th>
                <th className="w-[18%]">Cliente</th>
                <th className="w-[20%]">Veículo / Peça</th>
                <th className="w-[22%]">Defeitos Relatados</th>
                <th className="w-[13%]">Mão de Obra</th>
                <th className="w-[8%]">Data</th>
                <th className="w-[7%] text-right">Ações</th>
              </tr>
            </thead>`;
table2TheadOld = table2TheadOld.replace(/\r\n/g, '\n');

let table2TheadNew = `            <thead>
              <tr>
                <th className="w-[12%]">OS / Data</th>
                <th className="w-[20%]">Veículo / Peça</th>
                <th className="w-[22%]">Defeito Relatado</th>
                <th className="w-[12%]">Técnico</th>
                <th className="w-[18%]">Cliente</th>
                <th className="w-[9%] text-center">Status</th>
                <th className="w-[7%] text-right">Ações</th>
              </tr>
            </thead>`;
table2TheadNew = table2TheadNew.replace(/\r\n/g, '\n');

if(content.includes(table2TheadOld)) {
  content = content.replace(table2TheadOld, table2TheadNew);
}

fs.writeFileSync(filePath, content);
console.log("Headers updated.");
