import { useState, useEffect, type FormEvent } from "react";
import { ColaboradorService } from "../../services/colaborador.service";
import { toast } from "react-toastify";
import {
  User,
  Briefcase,
  MapPin,
  DollarSign,
  BadgeCheck,
  ArrowLeft,
  Search,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import type { IFuncionario } from "../../types/backend";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ConfirmModal } from "../ui/ConfirmModal";

interface FuncionarioFormProps {
  initialData?: IFuncionario | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const FuncionarioForm = ({
  initialData,
  onSuccess,
  onCancel,
}: FuncionarioFormProps) => {
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: "save" | "cancel";
  }>({ show: false, type: "save" });

  const [formData, setFormData] = useState({
    // Pessoa / PF (Base)
    nome: "",
    genero: "",
    dt_nascimento: "",
    cpf: "",
    rg: "",

    // Identificação Profissional (MEI) - Funcionario Table
    razao_social: "",
    nome_fantasia: "",
    cnpj_mei: "",
    inscricao_municipal: "",

    // Endereço (Funcionario Table)
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",

    // Contato Pessoal
    telefone_pessoal: "",
    email_pessoal: "",

    // Operacional
    cargo: "",
    ativo: "S",
    dt_admissao: new Date().toISOString().split("T")[0],
    especialidade: "",
    tipo_pagamento: "", // HORA / FIXO
    valor_pagamento: "",

    // Comissões
    comissao: "", // MO %
    comissao_pecas: "", // Peças %

    // Financeiro
    banco: "",
    agencia: "",
    conta: "",
    chave_pix: "",
    periodicidade_pagamento: "",
    dia_vencimento: "",

    // Doc Links
    url_ccmei: "",
    url_cnh: "",
    equipamentos_epis: "",

    obs: "",
  });

  useEffect(() => {
    if (initialData) {
      const pf = initialData.pessoa_fisica;
      const p = pf?.pessoa;

      setFormData({
        nome: p?.nome || "",
        genero: p?.genero || "",
        dt_nascimento: p?.dt_nascimento
          ? new Date(p.dt_nascimento).toISOString().split("T")[0]
          : "",
        cpf: pf?.cpf || "",
        rg: initialData.rg || "",

        razao_social: initialData.razao_social || "",
        nome_fantasia: initialData.nome_fantasia || "",
        cnpj_mei: initialData.cnpj_mei || "",
        inscricao_municipal: initialData.inscricao_municipal || "",

        cep: initialData.cep || "",
        logradouro: initialData.logradouro || "",
        numero: initialData.numero || "",
        complemento: initialData.complemento || "",
        bairro: initialData.bairro || "",
        cidade: initialData.cidade || "",
        uf: initialData.uf || "",

        telefone_pessoal: initialData.telefone_pessoal || "",
        email_pessoal: initialData.email_pessoal || "",

        cargo: initialData.cargo || "",
        ativo: initialData.ativo || "S",
        dt_admissao: initialData.dt_admissao
          ? new Date(initialData.dt_admissao).toISOString().split("T")[0]
          : "",
        especialidade: initialData.especialidade || "",
        tipo_pagamento: initialData.tipo_pagamento || "",
        valor_pagamento: initialData.valor_pagamento
          ? String(initialData.valor_pagamento)
          : "",

        comissao: initialData.comissao ? String(initialData.comissao) : "",
        comissao_pecas: initialData.comissao_pecas
          ? String(initialData.comissao_pecas)
          : "",

        banco: initialData.banco || "",
        agencia: initialData.agencia || "",
        conta: initialData.conta || "",
        chave_pix: initialData.chave_pix || "",
        periodicidade_pagamento: initialData.periodicidade_pagamento || "",
        dia_vencimento: initialData.dia_vencimento
          ? String(initialData.dia_vencimento)
          : "",

        url_ccmei: initialData.url_ccmei || "",
        url_cnh: initialData.url_cnh || "",
        equipamentos_epis: initialData.equipamentos_epis || "",

        obs: initialData.obs || "",
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleCepBlur = async () => {
    const cepRaw = formData.cep.replace(/\D/g, "");
    if (cepRaw.length === 8) {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cepRaw}/json/`,
        );
        const data = await response.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
          }));
          setIsDirty(true);
        }
      } catch (error) {
        console.error("Erro CEP", error);
      }
    }
  };

  // Logic to execute the save action
  const executeSubmit = async () => {
    setConfirmModal((prev) => ({ ...prev, show: false }));
    setLoading(true);
    try {
      // Payload helper
      const getFuncionarioPayload = (): any => ({
        // Fields
        ativo: formData.ativo,
        cargo: formData.cargo,
        salario: null,
        valor_pagamento: formData.valor_pagamento
          ? Number(formData.valor_pagamento)
          : null,
        tipo_pagamento: formData.tipo_pagamento || null,

        comissao: formData.comissao ? Number(formData.comissao) : null,
        comissao_pecas: formData.comissao_pecas
          ? Number(formData.comissao_pecas)
          : null,

        dt_admissao: new Date(formData.dt_admissao).toISOString(),
        obs: formData.obs || null,

        // MEI
        razao_social: formData.razao_social || null,
        nome_fantasia: formData.nome_fantasia || null,
        cnpj_mei: formData.cnpj_mei || null,
        inscricao_municipal: formData.inscricao_municipal || null,

        // Personal / Address
        rg: formData.rg || null,
        cep: formData.cep || null,
        logradouro: formData.logradouro || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        uf: formData.uf || null,
        telefone_pessoal: formData.telefone_pessoal || null,
        email_pessoal: formData.email_pessoal || null,

        especialidade: formData.especialidade || null,

        // Finance
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        chave_pix: formData.chave_pix || null,
        periodicidade_pagamento: formData.periodicidade_pagamento || null,
        dia_vencimento: formData.dia_vencimento
          ? Number(formData.dia_vencimento)
          : null,

        // Docs
        url_ccmei: formData.url_ccmei || null,
        url_cnh: formData.url_cnh || null,
        equipamentos_epis: formData.equipamentos_epis || null,
      });

      const pessoaCreateData = {
        nome: formData.nome,
        genero: formData.genero || null,
        dt_nascimento: formData.dt_nascimento
          ? new Date(formData.dt_nascimento).toISOString()
          : null,
      };

      if (initialData) {
        // UPDATE
        await ColaboradorService.update(
          initialData.id_funcionario,
          getFuncionarioPayload(),
          pessoaCreateData,
          initialData.pessoa_fisica?.pessoa?.id_pessoa,
        );
      } else {
        // CREATE
        await ColaboradorService.create(
          getFuncionarioPayload(),
          pessoaCreateData,
          formData.cpf,
        );
      }

      onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Erro ao salvar colaborador.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Logic to execute cancel
  const executeCancel = () => {
    setConfirmModal((prev) => ({ ...prev, show: false }));
    onCancel();
  };

  const handleAttemptSubmit = (e: FormEvent) => {
    e.preventDefault();
    setConfirmModal({ show: true, type: "save" });
  };

  const handleAttemptCancel = () => {
    if (isDirty) {
      setConfirmModal({ show: true, type: "cancel" });
    } else {
      onCancel();
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleAttemptCancel}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">
            {initialData ? "Editar Colaborador" : "Novo Colaborador"}
          </h1>
          <p className="text-neutral-500 text-sm">
            {initialData
              ? "Atualize os dados e comissões do colaborador."
              : "Preencha o formulário para adicionar um novo membro à equipe."}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleAttemptSubmit}
        className="space-y-6 text-neutral-900" // Standard spacing
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* COL 1 & 2 */}
          <div className="space-y-8 xl:col-span-2">
            {/* ID PESSOAL */}
            <div className="bg-neutral-25 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                  <User size={24} />
                </div>
                <h3 className="text-lg font-bold text-neutral-500">
                  Dados Pessoais
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Nome Completo *"
                    value={formData.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="CPF *"
                    value={formData.cpf}
                    onChange={(e) => handleChange("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    required={!initialData}
                    disabled={!!initialData}
                  />
                </div>
                <div>
                  <Input
                    label="RG"
                    value={formData.rg}
                    onChange={(e) => handleChange("rg", e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label="Data de Nascimento"
                    type="date"
                    value={formData.dt_nascimento}
                    onChange={(e) =>
                      handleChange("dt_nascimento", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                    Gênero
                  </label>
                  <select
                    value={formData.genero}
                    onChange={(e) => handleChange("genero", e.target.value)}
                    className="w-full transition-all outline-none rounded-lg border text-sm disabled:opacity-50 disabled:bg-neutral-100 border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-900 bg-neutral-25 px-4 py-2.5"
                  >
                    <option value="">Selecione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ID PROFISSIONAL (MEI) */}
            <div className="bg-neutral-25 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                <div className="p-3 bg-neutral-900 text-neutral-50 rounded-xl">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-lg font-bold text-neutral-500">
                  Identificação Profissional (MEI)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Razão Social"
                    value={formData.razao_social}
                    onChange={(e) =>
                      handleChange("razao_social", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Input
                    label="Nome Fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) =>
                      handleChange("nome_fantasia", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Input
                    label="CNPJ MEI"
                    value={formData.cnpj_mei}
                    onChange={(e) => handleChange("cnpj_mei", e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label="Inscrição Municipal"
                    value={formData.inscricao_municipal}
                    onChange={(e) =>
                      handleChange("inscricao_municipal", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* ADDRESS */}
            <div className="bg-neutral-25 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MapPin size={24} />
                </div>
                <h3 className="text-lg font-bold text-neutral-500">
                  Endereço Residencial
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="CEP"
                    value={formData.cep}
                    onChange={(e) => handleChange("cep", e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    icon={Search}
                  />
                </div>
                <div className="md:col-span-4">
                  <Input
                    label="Logradouro"
                    value={formData.logradouro}
                    onChange={(e) => handleChange("logradouro", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Número"
                    value={formData.numero}
                    onChange={(e) => handleChange("numero", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Complemento"
                    value={formData.complemento}
                    onChange={(e) =>
                      handleChange("complemento", e.target.value)
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Bairro"
                    value={formData.bairro}
                    onChange={(e) => handleChange("bairro", e.target.value)}
                  />
                </div>
                <div className="md:col-span-4">
                  <Input
                    label="Cidade"
                    value={formData.cidade}
                    onChange={(e) => handleChange("cidade", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="UF"
                    value={formData.uf}
                    onChange={(e) => handleChange("uf", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COL 3: OPERACIONAL & FINANCEIRO & LINKS */}
          <div className="space-y-8">
            {/* CONTATO + OPERACIONAL */}
            <div className="bg-neutral-25 p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Smartphone size={24} />
                </div>
                <h3 className="text-lg font-neutral-900 text-neutral-900">
                  Contato & Cargo
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Input
                    label="Cargo / Função *"
                    value={formData.cargo}
                    onChange={(e) => handleChange("cargo", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Telefone / WhatsApp"
                    value={formData.telefone_pessoal}
                    onChange={(e) =>
                      handleChange("telefone_pessoal", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Input
                    label="E-mail"
                    value={formData.email_pessoal}
                    onChange={(e) =>
                      handleChange("email_pessoal", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Input
                    label="Especialidade"
                    value={formData.especialidade}
                    onChange={(e) =>
                      handleChange("especialidade", e.target.value)
                    }
                    placeholder="Ex: Injeção, Suspensão"
                  />
                </div>
              </div>
            </div>

            {/* FINANCEIRO */}
            <div className="bg-neutral-25 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign size={24} />
                </div>
                <h3 className="text-lg font-bold text-neutral-500">
                  Financeiro
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                    Tipo Pagamento
                  </label>
                  <select
                    value={formData.tipo_pagamento}
                    onChange={(e) =>
                      handleChange("tipo_pagamento", e.target.value)
                    }
                    className="w-full transition-all outline-none rounded-lg border text-sm disabled:opacity-50 disabled:bg-neutral-100 border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-900 bg-neutral-25 px-4 py-2.5"
                  >
                    <option value="">Selecione...</option>
                    <option value="HORA">Valor Hora</option>
                    <option value="FIXO_MENSAL">Mensal Fixo</option>
                  </select>
                </div>
                <div>
                  <Input
                    label="Valor (R$)"
                    value={formData.valor_pagamento}
                    onChange={(e) =>
                      handleChange("valor_pagamento", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Comissão M.O (%)"
                    value={formData.comissao}
                    onChange={(e) => handleChange("comissao", e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label="Comissão Peça (%)"
                    value={formData.comissao_pecas}
                    onChange={(e) =>
                      handleChange("comissao_pecas", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    label="Chave PIX"
                    value={formData.chave_pix}
                    onChange={(e) => handleChange("chave_pix", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={formData.banco}
                    onChange={(e) => handleChange("banco", e.target.value)}
                    placeholder="Banco"
                  />
                  <Input
                    value={formData.agencia}
                    onChange={(e) => handleChange("agencia", e.target.value)}
                    placeholder="Agência"
                  />
                  <Input
                    value={formData.conta}
                    onChange={(e) => handleChange("conta", e.target.value)}
                    placeholder="Conta"
                  />
                </div>
              </div>
            </div>

            {/* DOCUMENTOS */}
            <div className="bg-neutral-25 p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                <div className="p-3 bg-neutral-100 text-neutral-600 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-bold text-neutral-500">
                  Documentação
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Input
                    label="CCMEI (PDF URL)"
                    value={formData.url_ccmei}
                    onChange={(e) => handleChange("url_ccmei", e.target.value)}
                    placeholder="Link do Drive/Arquivo"
                  />
                </div>
                <div>
                  <Input
                    label="CNH (PDF URL)"
                    value={formData.url_cnh}
                    onChange={(e) => handleChange("url_cnh", e.target.value)}
                    placeholder="Link do Drive/Arquivo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                    Equipamentos / EPIs
                  </label>
                  <textarea
                    value={formData.equipamentos_epis}
                    onChange={(e) =>
                      handleChange("equipamentos_epis", e.target.value)
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-medium text-neutral-800 text-sm min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col-reverse md:flex-row justify-end gap-4 pt-6 border-t border-neutral-200">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={handleAttemptCancel}
            type="button"
            size="lg"
            className="px-8 text-neutral-500 hover:text-neutral-700 font-bold"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={BadgeCheck}
            type="submit"
            disabled={loading}
            size="lg"
            className="px-12"
          >
            Salvar Cadastro
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
        onConfirm={confirmModal.type === "save" ? executeSubmit : executeCancel}
        title={
          confirmModal.type === "save"
            ? "Salvar Alterações"
            : "Descartar Alterações?"
        }
        description={
          confirmModal.type === "save"
            ? "Deseja confirmar o cadastro/atualização deste colaborador?"
            : "Existem dados não salvos. Deseja realmente sair?"
        }
        variant={confirmModal.type === "save" ? "primary" : "danger"}
      />
    </div>
  );
};
