import { useState, useEffect, type FormEvent } from "react";
import { api } from "../../services/api";
import {
  Phone,
  FileText,
  MapPin,
  DollarSign,
  Building2,
  Save,
  CheckCircle,
  Search,
  ArrowLeft,
} from "lucide-react";
import type { IFornecedor } from "../../types/backend";
import { Button } from "../ui/Button";
import { Input } from "../ui/input";
import { toast } from "react-toastify";

interface FornecedorFormProps {
  initialData?: IFornecedor | null;
  onSuccess: (data?: IFornecedor) => void;
  onCancel: () => void;
}

export const FornecedorForm = ({
  initialData,
  onSuccess,
  onCancel,
}: FornecedorFormProps) => {
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Identificação
    tipo_pessoa: "JURIDICA",
    nome: "", // Razão Social / Nome Completo
    nome_fantasia: "",
    documento: "", // CNPJ / CPF
    inscricao_estadual: "",
    inscricao_municipal: "",

    // Contato
    contato: "", // Nome Vendedor
    telefone: "",
    whatsapp: "",
    email: "",

    // Endereço
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",

    // Financeiro
    banco: "",
    agencia: "",
    conta: "",
    chave_pix: "",
    condicoes_pagamento: "",
    categoria_produto: "",

    // Extra
    obs: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        tipo_pessoa: initialData.tipo_pessoa || "JURIDICA",
        nome: initialData.nome || "",
        nome_fantasia: initialData.nome_fantasia || "",
        documento: initialData.documento || "",
        inscricao_estadual: initialData.inscricao_estadual || "",
        inscricao_municipal: initialData.inscricao_municipal || "",

        contato: initialData.contato || "",
        telefone: initialData.telefone || "",
        whatsapp: initialData.whatsapp || "",
        email: initialData.email || "",

        cep: initialData.cep || "",
        logradouro: initialData.logradouro || "",
        numero: initialData.numero || "",
        complemento: initialData.complemento || "",
        bairro: initialData.bairro || "",
        cidade: initialData.cidade || "",
        uf: initialData.uf || "",

        banco: initialData.banco || "",
        agencia: initialData.agencia || "",
        conta: initialData.conta || "",
        chave_pix: initialData.chave_pix || "",
        condicoes_pagamento: initialData.condicoes_pagamento || "",
        categoria_produto: initialData.categoria_produto || "",

        obs: initialData.obs || "",
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (initialData?.id_fornecedor) {
        res = await api.put(
          `/fornecedor/${initialData.id_fornecedor}`,
          formData,
        );
      } else {
        res = await api.post("/fornecedor", formData);
      }
      onSuccess(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar fornecedor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">
            {initialData ? "Editar Fornecedor" : "Novo Fornecedor"}
          </h1>
          <p className="text-neutral-500 text-sm">
            Preencha os dados completos do parceiro.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-neutral-900">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* LEFT COLUMN: Identification & Contact */}
          <div className="space-y-8 xl:col-span-2">
            {/* SECTION 1: IDENTIFICAÇÃO */}
            <div className="bg-neutral-25 p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                  <Building2 size={20} />
                </div>
                <h2 className="font-bold text-lg text-neutral-800">
                  Identificação
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                    Tipo de Pessoa
                  </label>
                  <div className="flex gap-4">
                    <label
                      className={`flex-1 cursor-pointer border px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all ${formData.tipo_pessoa === "JURIDICA" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}
                    >
                      <input
                        type="radio"
                        name="tipo_pessoa"
                        value="JURIDICA"
                        checked={formData.tipo_pessoa === "JURIDICA"}
                        onChange={(e) =>
                          handleChange("tipo_pessoa", e.target.value)
                        }
                        className="hidden"
                      />
                      Jurídica (CNPJ)
                    </label>
                    <label
                      className={`flex-1 cursor-pointer border px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all ${formData.tipo_pessoa === "FISICA" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}
                    >
                      <input
                        type="radio"
                        name="tipo_pessoa"
                        value="FISICA"
                        checked={formData.tipo_pessoa === "FISICA"}
                        onChange={(e) =>
                          handleChange("tipo_pessoa", e.target.value)
                        }
                        className="hidden"
                      />
                      Física (CPF)
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Input
                    label="Razão Social / Nome Completo *"
                    value={formData.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                    placeholder="Nome oficial no documento"
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Nome Fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) =>
                      handleChange("nome_fantasia", e.target.value)
                    }
                    placeholder="Como a empresa é conhecida"
                  />
                </div>

                <div>
                  <Input
                    label={formData.tipo_pessoa === "JURIDICA" ? "CNPJ" : "CPF"}
                    value={formData.documento}
                    onChange={(e) => handleChange("documento", e.target.value)}
                    placeholder="Apenas números"
                  />
                </div>

                <div>
                  <Input
                    label="Inscrição Estadual"
                    value={formData.inscricao_estadual}
                    onChange={(e) =>
                      handleChange("inscricao_estadual", e.target.value)
                    }
                    placeholder="IE (Comércio)"
                  />
                </div>

                <div>
                  <Input
                    label="Inscrição Municipal"
                    value={formData.inscricao_municipal}
                    onChange={(e) =>
                      handleChange("inscricao_municipal", e.target.value)
                    }
                    placeholder="IM (Serviços)"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: ENDEREÇO (LOGÍSTICA) */}
            <div className="bg-neutral-25 p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
                  <MapPin size={20} />
                </div>
                <h2 className="font-bold text-lg text-neutral-800">
                  Endereço e Logística
                </h2>
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
                    placeholder="Rua, Avenida, etc."
                    className="uppercase"
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
                    placeholder="Sala, Bloco..."
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    label="Bairro"
                    value={formData.bairro}
                    onChange={(e) => handleChange("bairro", e.target.value)}
                    className="uppercase"
                  />
                </div>

                <div className="md:col-span-4">
                  <Input
                    label="Cidade"
                    value={formData.cidade}
                    onChange={(e) => handleChange("cidade", e.target.value)}
                    className="uppercase"
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    label="UF"
                    value={formData.uf}
                    onChange={(e) => handleChange("uf", e.target.value)}
                    className="uppercase"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Contact & Finance */}
          <div className="space-y-8">
            {/* SECTION 3: CONTATO */}
            <div className="bg-neutral-25 p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6 h-full">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                <div className="bg-green-50 p-2 rounded-lg text-green-600">
                  <Phone size={20} />
                </div>
                <h2 className="font-bold text-lg text-neutral-800">
                  Dados de Contato
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    label="Vendedor / Contato"
                    value={formData.contato}
                    onChange={(e) => handleChange("contato", e.target.value)}
                    placeholder="Com quem falar"
                  />
                </div>
                <div>
                  <Input
                    label="Telefone Fixo"
                    value={formData.telefone}
                    onChange={(e) => handleChange("telefone", e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label="WhatsApp / Celular"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label="E-mail (NFE/Boletos)"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="financeiro@empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: FINANCEIRO */}
            <div className="bg-neutral-25 p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                  <DollarSign size={20} />
                </div>
                <h2 className="font-bold text-lg text-neutral-800">
                  Financeiro
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                    Dados Bancários / PIX
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
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
                    <div className="col-span-2">
                      <Input
                        value={formData.conta}
                        onChange={(e) => handleChange("conta", e.target.value)}
                        placeholder="Conta Corrente"
                      />
                    </div>
                  </div>
                  <Input
                    value={formData.chave_pix}
                    onChange={(e) => handleChange("chave_pix", e.target.value)}
                    placeholder="Chave PIX"
                  />
                </div>

                <div>
                  <Input
                    label="Condição de Pagamento"
                    value={formData.condicoes_pagamento}
                    onChange={(e) =>
                      handleChange("condicoes_pagamento", e.target.value)
                    }
                    placeholder="Ex: 28 dias, 30/60..."
                  />
                </div>

                <div>
                  <Input
                    label="Categoria de Produto"
                    value={formData.categoria_produto}
                    onChange={(e) =>
                      handleChange("categoria_produto", e.target.value)
                    }
                    placeholder="Ex: Peças Motor, Pneus..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FULL WIDTH: OBS */}
          <div className="xl:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
              <div className="bg-neutral-100 p-2 rounded-lg text-neutral-600">
                <FileText size={20} />
              </div>
              <h2 className="font-bold text-lg text-neutral-800">
                Observações Gerais
              </h2>
            </div>
            <textarea
              value={formData.obs}
              onChange={(e) => handleChange("obs", e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-medium text-neutral-800 transition-all min-h-[120px] resize-none"
              placeholder="Informações adicionais importantes..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse md:flex-row justify-end gap-4 pt-6 border-t border-neutral-200">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onCancel}
            className="px-8 text-neutral-500 hover:text-neutral-700 font-bold"
          >
            CANCELAR
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            icon={initialData ? Save : CheckCircle}
            className="px-12"
          >
            {initialData ? "SALVAR ALTERAÇÕES" : "SALVAR FORNECEDOR"}
          </Button>
        </div>
      </form>
    </div>
  );
};
