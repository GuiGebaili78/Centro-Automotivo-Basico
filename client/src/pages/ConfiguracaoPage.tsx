import React, { useEffect, useState, useRef } from "react";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import {
  ConfiguracaoService,
  type Configuracao,
} from "../services/ConfiguracaoService";
import { toast } from "react-toastify";
import {
  Save,
  Upload,
  Building2,
  Phone,
  Mail,
  FileText,
  MapPin,
} from "lucide-react";

export const ConfiguracaoPage = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<Configuracao>({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    endereco: "",
    telefone: "",
    email: "",
    logoUrl: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await ConfiguracaoService.get();
      if (config) {
        setFormData(config);
        if (config.logoUrl) {
          const apiUrl =
            import.meta.env.VITE_API_URL || "http://localhost:3000";
          setLogoPreview(`${apiUrl}${config.logoUrl}`);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações.");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append("nomeFantasia", formData.nomeFantasia);
      data.append("razaoSocial", formData.razaoSocial || "");
      data.append("cnpj", formData.cnpj || "");
      data.append("endereco", formData.endereco || "");
      data.append("telefone", formData.telefone || "");
      data.append("email", formData.email || "");

      if (fileInputRef.current?.files?.[0]) {
        data.append("logo", fileInputRef.current.files[0]);
      }

      const updatedConfig = await ConfiguracaoService.save(data);
      setFormData(updatedConfig);

      // Update preview with new URL from server
      if (updatedConfig.logoUrl) {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        setLogoPreview(`${apiUrl}${updatedConfig.logoUrl}`);
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (initialLoading) {
    return (
      <PageLayout title="Configurações" subtitle="">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Configurações da Oficina"
      subtitle="Gerencie os dados da sua empresa para impressões e documentos"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Logo */}
          <div className="lg:col-span-1">
            <Card
              title="Logotipo"
              description="Imagem que sairá nas impressões"
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-48 h-48 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer hover:border-primary-500 transition-colors relative group"
                  onClick={triggerFileInput}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-sm text-slate-500">
                        Clique para enviar
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium">
                      Alterar Logo
                    </span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <p className="text-xs text-slate-500 text-center">
                  Recomendado: Imagem PNG ou JPG quadrada ou retangular.
                </p>
              </div>
            </Card>
          </div>

          {/* Coluna Direita: Dados */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Dados da Empresa" description="Informações cadastrais">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Nome Fantasia"
                    name="nomeFantasia"
                    value={formData.nomeFantasia}
                    onChange={handleChange}
                    placeholder="Ex: Centro Automotivo Silva"
                    icon={Building2}
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <Input
                    label="Razão Social"
                    name="razaoSocial"
                    value={formData.razaoSocial || ""}
                    onChange={handleChange}
                    placeholder="Ex: Silva Mecânica LTDA"
                    icon={FileText}
                  />
                </div>

                <div className="md:col-span-1">
                  <Input
                    label="CNPJ"
                    name="cnpj"
                    value={formData.cnpj || ""}
                    onChange={handleChange}
                    placeholder="00.000.000/0001-00"
                    icon={FileText}
                  />
                </div>
              </div>
            </Card>

            <Card
              title="Contato e Endereço"
              description="Canais de comunicação e localização"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <Input
                    label="Telefone / WhatsApp"
                    name="telefone"
                    value={formData.telefone || ""}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    icon={Phone}
                  />
                </div>

                <div className="md:col-span-1">
                  <Input
                    label="E-mail"
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    placeholder="contato@minhaoficina.com"
                    icon={Mail}
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    label="Endereço Completo"
                    name="endereco"
                    value={formData.endereco || ""}
                    onChange={handleChange}
                    placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF"
                    icon={MapPin}
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                icon={Save}
                isLoading={loading}
              >
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
};
