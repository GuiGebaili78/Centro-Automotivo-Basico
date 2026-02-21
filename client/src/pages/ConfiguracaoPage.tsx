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
  const [logoZoom, setLogoZoom] = useState(100);
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isNewUpload, setIsNewUpload] = useState(false);
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
          setLogoPreview(`${apiUrl}${config.logoUrl}?t=${Date.now()}`);
          setIsNewUpload(false);
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
        setIsNewUpload(true);
        // Reset zoom and position when new image is loaded
        setLogoZoom(100);
        setLogoPosition({ x: 50, y: 50 });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateProcessedLogo = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!logoPreview) {
        resolve(null);
        return;
      }

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        // Set canvas size to match sidebar dimensions (2:1 ratio)
        const width = 512;
        const height = 256;
        canvas.width = width;
        canvas.height = height;

        // Calculate scaled dimensions
        // FIX: Calculate scale to fit canvas first (like object-contain)
        const scaleX = width / img.width;
        const scaleY = height / img.height;
        const baseScale = Math.min(scaleX, scaleY);

        // Apply user zoom on top of base scale
        const finalScale = baseScale * (logoZoom / 100);

        const scaledWidth = img.width * finalScale;
        const scaledHeight = img.height * finalScale;

        // Calculate position offsets (center on the position point)
        // Adjust logic to better match the transform-origin behavior if needed,
        // but for now standard centering based on position works for the zoom fix.
        // If position is 50,50 (default), this centers the image.
        const offsetX = width / 2 - scaledWidth * (logoPosition.x / 100);
        const offsetY = height / 2 - scaledHeight * (logoPosition.y / 100);

        // Draw image with transformations
        ctx.fillStyle = "transparent";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      };
      img.src = logoPreview;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append("nomeFantasia", formData.nomeFantasia);
      data.append("razaoSocial", formData.razaoSocial || "");
      data.append("cnpj", formData.cnpj || "");
      data.append("inscricaoEstadual", formData.inscricaoEstadual || "");
      data.append("endereco", formData.endereco || "");
      data.append("telefone", formData.telefone || "");
      data.append("email", formData.email || "");

      // Generate processed logo if there's a preview
      if (logoPreview) {
        const processedBlob = await generateProcessedLogo();
        if (processedBlob) {
          data.append("logo", processedBlob, "logo.png");
        }
      }

      const updatedConfig = await ConfiguracaoService.save(data);
      setFormData(updatedConfig);

      // Update preview with new URL from server
      if (updatedConfig.logoUrl) {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        setLogoPreview(`${apiUrl}${updatedConfig.logoUrl}?t=${Date.now()}`);
        setIsNewUpload(false);
        // Reset zoom and position after save
        setLogoZoom(100);
        setLogoPosition({ x: 50, y: 50 });
      }

      toast.success("Configurações salvas com sucesso!");

      // Notifica outros componentes (como Sidebar) sobre a atualização
      window.dispatchEvent(new Event("configuracao-updated"));
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
                  className="w-64 h-32 p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden relative flex items-center justify-center"
                  onClick={() => {
                    if (!logoPreview) triggerFileInput();
                  }}
                >
                  {logoPreview ? (
                    <div
                      className="w-full h-full flex items-center justify-center cursor-move"
                      style={
                        isNewUpload
                          ? {
                              transform: `scale(${logoZoom / 100})`,
                              transformOrigin: `${logoPosition.x}% ${logoPosition.y}%`,
                            }
                          : undefined
                      }
                      onMouseDown={(e) => {
                        if (isNewUpload) {
                          setIsDragging(true);
                          e.preventDefault();
                        }
                      }}
                      onMouseMove={(e) => {
                        if (isDragging && isNewUpload) {
                          const rect =
                            e.currentTarget.parentElement!.getBoundingClientRect();
                          const x =
                            ((e.clientX - rect.left) / rect.width) * 100;
                          const y =
                            ((e.clientY - rect.top) / rect.height) * 100;
                          setLogoPosition({
                            x: Math.max(0, Math.min(100, x)),
                            y: Math.max(0, Math.min(100, y)),
                          });
                        }
                      }}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                    >
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="text-center p-4">
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <span className="text-sm text-slate-500 font-medium">
                          Clique para enviar
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {logoPreview && (
                  <div className="w-full space-y-3">
                    {isNewUpload && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">
                            Zoom: {logoZoom}%
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="200"
                            value={logoZoom}
                            onChange={(e) =>
                              setLogoZoom(Number(e.target.value))
                            }
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                        </div>
                        <p className="text-xs text-slate-500 text-center">
                          💡 Arraste o logo para reposicionar
                        </p>
                      </>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                            fileInputRef.current.click();
                          }
                        }}
                        className="py-2 px-3 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
                      >
                        📷 {isNewUpload ? "Trocar" : "Alterar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          setIsNewUpload(false);
                          setFormData({ ...formData, logoUrl: "" });
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="py-2 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {!logoPreview && (
                  <p className="text-xs text-slate-500 text-center">
                    Recomendado: Imagem PNG ou JPG quadrada ou retangular.
                  </p>
                )}
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

                <div className="md:col-span-1">
                  <Input
                    label="Inscrição Estadual"
                    name="inscricaoEstadual"
                    value={formData.inscricaoEstadual || ""}
                    onChange={handleChange}
                    placeholder="IE Isento ou Número"
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
