const fs = require('fs');
const filePath = 'client/src/pages/FechamentoFinanceiroPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const t1Start = content.indexOf('{pendingOss.map((os) => (');
const t1End = content.indexOf('</tbody>', t1Start);

const newT1Map = `{pendingOss.map((os) => (
                  <tr
                    key={os.id_os}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col items-start">
                        <div className="text-base font-bold text-neutral-600">
                          OS | {os.id_os}
                        </div>
                        {os.dt_abertura && (
                          <div className="flex flex-col">
                            <span className="text-xs text-neutral-600 font-medium">
                              {new Date(os.dt_abertura).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-neutral-600 font-medium">
                              {new Date(os.dt_abertura).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        {os.veiculo ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {os.veiculo.marca} {os.veiculo.modelo} •{" "}
                              {os.veiculo.cor}
                            </span>
                            <span className="text-base text-primary-600 uppercase mt-0.5 break-all">
                              {os.veiculo.placa} - {os.veiculo.ano_fabricacao && os.veiculo.ano_modelo ? \`\${os.veiculo.ano_fabricacao}/\${os.veiculo.ano_modelo}\` : os.veiculo.ano_fabricacao || os.veiculo.ano_modelo || "---"}
                            </span>
                          </>
                        ) : os.equipamento ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {os.equipamento.nome_peca}
                            </span>
                            <span className="text-sm text-neutral-400 mt-1 italic break-words">
                              {os.equipamento.fabricante &&
                                \`Marca: \${os.equipamento.fabricante}\`}
                              {os.equipamento.numeracao &&
                                \` • S/N: \${os.equipamento.numeracao}\`}
                            </span>
                          </>
                        ) : (
                          <span className="text-neutral-300 italic">
                            Serviço Avulso
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <p className="text-sm text-neutral-600 line-clamp-2 uppercase leading-relaxed break-words" title={os.defeito_relatado || os.diagnostico || ""}>
                          {os.defeito_relatado || os.diagnostico || <span className="text-neutral-300 italic">---</span>}
                        </p>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const mechanics = os.servicos_mao_de_obra
                              ?.map((s: any) => s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(" ")[0])
                              .filter(Boolean);
                            const uniqueMechanics = [...new Set(mechanics || [])];
                            if (uniqueMechanics.length > 0) {
                              return uniqueMechanics.map((mech: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed"
                                >
                                  {mech}
                                </span>
                              ));
                            }
                            return <span className="text-neutral-300 text-xs text-center ml-2">---</span>;
                          })()}
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <span className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed break-words" title={getClientName(os)}>
                          {getClientName(os)}
                        </span>
                        {os.cliente?.telefone_1 && (
                          <span className="text-sm text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
                            {formatPhone(os.cliente.telefone_1)}
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={\`px-2 py-1 rounded-md text-xs font-black uppercase whitespace-nowrap ring-1 \${getStatusStyle(
                            os.status,
                          )}\`}
                        >
                          {os.status === "PRONTO PARA FINANCEIRO"
                            ? "FINANCEIRO"
                            : os.status === "ORCAMENTO"
                            ? "ORÇAMENTO"
                            : os.status.replace(/_/g, " ")}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleOpenFechamento(os.id_os); }}
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

content = content.substring(0, t1Start) + newT1Map + content.substring(t1End);

const t2Start = content.indexOf('{filteredFechamentos.length === 0 ? (');
const t2End = content.indexOf('</tbody>', t2Start);

const newT2Map = `{filteredFechamentos.length === 0 ? (
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
                      <div className="flex flex-col items-start">
                        <div className="text-base font-bold text-neutral-600">
                          OS | {fech.id_os}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-neutral-600 font-medium">
                            {fech.data_fechamento_financeiro ? new Date(fech.data_fechamento_financeiro).toLocaleDateString() : "---"}
                          </span>
                          <span className="text-xs text-emerald-600 font-bold mt-1">
                            {formatCurrency(Number(fech.ordem_de_servico?.valor_total_cliente || 0))}
                          </span>
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        {fech.ordem_de_servico?.veiculo ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {fech.ordem_de_servico.veiculo.marca} {fech.ordem_de_servico.veiculo.modelo} •{" "}
                              {fech.ordem_de_servico.veiculo.cor}
                            </span>
                            <span className="text-base text-primary-600 uppercase mt-0.5 break-all">
                              {fech.ordem_de_servico.veiculo.placa} - {fech.ordem_de_servico.veiculo.ano_fabricacao && fech.ordem_de_servico.veiculo.ano_modelo ? \`\${fech.ordem_de_servico.veiculo.ano_fabricacao}/\${fech.ordem_de_servico.veiculo.ano_modelo}\` : fech.ordem_de_servico.veiculo.ano_fabricacao || fech.ordem_de_servico.veiculo.ano_modelo || "---"}
                            </span>
                          </>
                        ) : fech.ordem_de_servico?.equipamento ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {fech.ordem_de_servico.equipamento.nome_peca}
                            </span>
                            <span className="text-sm text-neutral-400 mt-1 italic break-words">
                              {fech.ordem_de_servico.equipamento.fabricante &&
                                \`Marca: \${fech.ordem_de_servico.equipamento.fabricante}\`}
                              {fech.ordem_de_servico.equipamento.numeracao &&
                                \` • S/N: \${fech.ordem_de_servico.equipamento.numeracao}\`}
                            </span>
                          </>
                        ) : (
                          <span className="text-neutral-300 italic">
                            Serviço Avulso
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <p className="text-sm text-neutral-600 line-clamp-2 uppercase leading-relaxed break-words" title={fech.ordem_de_servico?.defeito_relatado || fech.ordem_de_servico?.diagnostico || ""}>
                          {fech.ordem_de_servico?.defeito_relatado || fech.ordem_de_servico?.diagnostico || <span className="text-neutral-300 italic">---</span>}
                        </p>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const mechanics = fech.ordem_de_servico?.servicos_mao_de_obra
                              ?.map((s: any) => s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(" ")[0])
                              .filter(Boolean);
                            const uniqueMechanics = [...new Set(mechanics || [])];
                            if (uniqueMechanics.length > 0) {
                              return uniqueMechanics.map((mech: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed"
                                >
                                  {mech}
                                </span>
                              ));
                            }
                            return <span className="text-neutral-300 text-xs text-center ml-2">---</span>;
                          })()}
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <span className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed break-words" title={getClientName(fech.ordem_de_servico)}>
                          {getClientName(fech.ordem_de_servico)}
                        </span>
                        {fech.ordem_de_servico?.cliente?.telefone_1 && (
                          <span className="text-sm text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
                            {formatPhone(fech.ordem_de_servico.cliente.telefone_1)}
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className="px-2 py-1 rounded-md text-xs font-black uppercase whitespace-nowrap ring-1 bg-green-50 text-green-700 ring-green-600/20"
                        >
                          FINALIZADA
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handlePrint(fech.ordem_de_servico); }}
                          icon={Printer}
                          label="Imprimir"
                          variant="neutral"
                        />
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handleEditFechamento(fech); }}
                          icon={Edit}
                          label="Editar"
                          variant="primary"
                        />
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(fech.id_fechamento_financeiro); }}
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

content = content.substring(0, t2Start) + newT2Map + content.substring(t2End);

fs.writeFileSync(filePath, content);
console.log("Tables updated completely.");
