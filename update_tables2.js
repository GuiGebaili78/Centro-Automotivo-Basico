const fs = require('fs');
const filePath = 'client/src/pages/FechamentoFinanceiroPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings for reliable matching
content = content.replace(/\r\n/g, '\n');

const table1TheadOld = `              <thead>
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

const table1TheadNew = `              <thead>
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

if(content.includes(table1TheadOld)) {
  content = content.replace(table1TheadOld, table1TheadNew);
} else {
  console.log("Failed to find Table 1 Thead!");
}

const table1MapTarget = content.substring(content.indexOf('{pendingOss.map((os) => ('), content.indexOf('</tbody>', content.indexOf('{pendingOss.map((os) => (')));

const table1MapNew = `{pendingOss.map((os) => (
                  <tr
                    key={os.id_os}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-neutral-800">OS | {os.id_os}</span>
                        {os.dt_abertura ? (
                          <>
                            <span className="text-xs text-neutral-600 font-medium mt-0.5">
                              {new Date(os.dt_abertura).toLocaleDateString("pt-BR")}
                            </span>
                            <span className="text-xs text-neutral-600 font-medium">
                              {new Date(os.dt_abertura).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-neutral-600 font-medium mt-0.5">&nbsp;</span>
                            <span className="text-xs text-neutral-600 font-medium">&nbsp;</span>
                          </>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-neutral-700 uppercase truncate">
                          {os.veiculo ? \`\${os.veiculo.marca} \${os.veiculo.modelo}\` : os.equipamento?.nome_peca || "Peça Avulsa"}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium font-mono mt-0.5 uppercase">
                          {os.veiculo?.placa || os.equipamento?.numeracao || "SEM REF"}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <p className="text-sm text-neutral-500 line-clamp-2 uppercase leading-relaxed break-words" title={os.defeito_relatado || os.diagnostico || ""}>
                          {os.defeito_relatado || os.diagnostico || <span className="text-neutral-300 italic">---</span>}
                        </p>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                          {(() => {
                            const mechanics = os.servicos_mao_de_obra
                              ?.map((s: any) => s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(" ")[0])
                              .filter(Boolean);
                            const uniqueMechanics = [...new Set(mechanics || [])];
                            if (uniqueMechanics.length > 0) {
                              return uniqueMechanics.map((mech: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-xs font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded uppercase truncate"
                                >
                                  {mech}
                                </span>
                              ));
                            }
                            return <span className="text-neutral-300 text-xs">---</span>;
                          })()}
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-neutral-700 uppercase truncate" title={getClientName(os)}>
                          {getClientName(os)}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium mt-0.5">
                          {os.cliente?.telefone_1 ? formatPhone(os.cliente.telefone_1) : "Sem telefone"}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={\`px-3 py-1 rounded-md text-sm font-bold uppercase whitespace-nowrap \${getStatusStyle(
                            os.status,
                          )}\`}
                        >
                          {os.status === "PRONTO PARA FINANCEIRO"
                            ? "FINANCEIRO"
                            : os.status.replace(/_/g, " ")}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleOpenFechamento(os.id_os)}
                          variant="primary"
                          size="sm"
                          icon={CheckCircle}
                        >
                          Fechar Financeiro
                        </Button>
                      </div>
                      <div className="h-4"></div>
                    </td>
                  </tr>
                ))}
`;

if(table1MapTarget.length > 0) {
  content = content.replace(table1MapTarget, table1MapNew);
} else {
  console.log("Failed to find Table 1 Map!");
}

const table2TheadOld = `            <thead>
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

const table2TheadNew = `            <thead>
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

if(content.includes(table2TheadOld)) {
  content = content.replace(table2TheadOld, table2TheadNew);
} else {
  console.log("Failed to find Table 2 Thead!");
}

const table2MapTarget = content.substring(content.indexOf('{filteredFechamentos.length === 0 ?'), content.indexOf('</tbody>', content.indexOf('{filteredFechamentos.length === 0 ?')));

const table2MapNew = `{filteredFechamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-4">
                      <p className="font-bold text-neutral-400 mb-2">
                        {universalFilters.search || universalFilters.startDate
                          ? "Nenhum registro encontrado para a busca."
                          : "Nenhum fechamento realizado ainda."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFechamentos.map((fech) => (
                  <tr
                    key={fech.id_fechamento_financeiro}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-neutral-800">OS | {fech.id_os}</span>
                        <span className="text-xs text-neutral-400 font-medium font-mono mt-0.5">
                          {fech.data_fechamento_financeiro ? new Date(fech.data_fechamento_financeiro).toLocaleDateString('pt-BR') : '---'}
                        </span>
                        <span className="text-xs text-emerald-600 font-bold mt-1">
                          {formatCurrency(Number(fech.ordem_de_servico?.valor_total_cliente || 0))}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-neutral-700 uppercase truncate">
                          {fech.ordem_de_servico?.veiculo ? \`\${fech.ordem_de_servico.veiculo.marca} \${fech.ordem_de_servico.veiculo.modelo}\` : fech.ordem_de_servico?.equipamento?.nome_peca || "Peça Avulsa"}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium font-mono mt-0.5 uppercase">
                          {fech.ordem_de_servico?.veiculo?.placa || fech.ordem_de_servico?.equipamento?.numeracao || "SEM REF"}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <p
                          className="text-sm text-neutral-500 line-clamp-2 uppercase leading-relaxed break-words"
                          title={fech.ordem_de_servico?.defeito_relatado || fech.ordem_de_servico?.diagnostico || ""}
                        >
                          {fech.ordem_de_servico?.defeito_relatado ||
                            fech.ordem_de_servico?.diagnostico || (
                              <span className="text-neutral-300 italic">---</span>
                            )}
                        </p>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                          {fech.ordem_de_servico?.servicos_mao_de_obra &&
                          fech.ordem_de_servico.servicos_mao_de_obra.length > 0 ? (
                            Array.from(
                              new Set(
                                fech.ordem_de_servico.servicos_mao_de_obra
                                  .map((svc) => svc.funcionario?.pessoa_fisica?.pessoa?.nome?.split(" ")[0])
                                  .filter(Boolean),
                              ),
                            ).map((name, idx) => (
                              <span
                                key={idx}
                                className="text-xs font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded uppercase truncate"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-300 text-xs">---</span>
                          )}
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-neutral-700 uppercase truncate" title={getClientName(fech.ordem_de_servico)}>
                          {getClientName(fech.ordem_de_servico)}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium mt-0.5">
                          {fech.ordem_de_servico?.cliente?.telefone_1 ? formatPhone(fech.ordem_de_servico.cliente.telefone_1) : "Sem telefone"}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-center">
                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 rounded-md text-sm font-bold uppercase whitespace-nowrap bg-green-100 text-green-700">
                          FINALIZADA
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          onClick={() => handlePrint(fech.ordem_de_servico)}
                          icon={Printer}
                          label="Imprimir"
                          variant="neutral"
                        />
                        <ActionButton
                          onClick={() => handleEditFechamento(fech)}
                          icon={Edit}
                          label="Editar"
                          variant="primary"
                        />
                        <ActionButton
                          onClick={() => setConfirmDeleteId(fech.id_fechamento_financeiro)}
                          icon={Trash2}
                          label="Cancelar"
                          variant="danger"
                        />
                      </div>
                      <div className="h-4"></div>
                    </td>
                  </tr>
                ))
              )}
`;

if(table2MapTarget.length > 0) {
  content = content.replace(table2MapTarget, table2MapNew);
} else {
  console.log("Failed to find Table 2 Map!");
}

// Write back with normalized line endings
fs.writeFileSync(filePath, content);
console.log('Update complete.');
